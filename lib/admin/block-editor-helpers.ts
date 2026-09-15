/**
 * Pure, framework-free helpers shared by the page editor
 * (app/admin/(dashboard)/pages/[id]/page-editor.tsx) and the shared
 * section editor (app/admin/(dashboard)/shared-sections/[id]/
 * shared-section-editor.tsx) for Task 13b. Kept out of either "use
 * client" component file so the array/DOM logic that actually matters
 * (where does a duplicate land, which element gets focused) can be unit
 * tested without mounting react-hook-form, dnd-kit, or a Server Action.
 */

/** The shape every block-list `useFieldArray` row has, regardless of the block-type-specific contents of `data`. */
export type EditableBlock = {
  type: string;
  is_visible: boolean;
  data: Record<string, unknown>;
};

/**
 * Deep-clones a block for "duplicate near source" (brief item 2): the
 * caller inserts the result immediately after the source's index via
 * react-hook-form's `insert(index + 1, ...)`, never `append` (end of
 * list). The deep clone (not a shallow `{...block}`) matters because
 * `data` can itself contain arrays/objects (e.g. an `array` FieldSpec's
 * items) — a shallow copy would let editing the duplicate's nested
 * fields mutate the source block's data too, since react-hook-form's
 * `insert` does not deep-clone what it's handed.
 */
export function cloneBlockForDuplicate<T extends EditableBlock>(block: T): T {
  return { ...block, data: JSON.parse(JSON.stringify(block.data ?? {})) };
}

/**
 * Where a validation failure's `blockIndex`/`field` (lib/validation/
 * blocks.ts's `validateBlockList`) should scroll to and focus, once the
 * failing block's row is open in the DOM. `container` is the block row's
 * outer element; `namePrefix` matches exactly what BlockFieldsForm passes
 * to FieldRenderer (`blocks.<index>.data`), since `field` is the same
 * dotted Zod issue path `formatZodError` produces (e.g. "benefits.0.title")
 * and every text/textarea/number/select FieldRenderer case registers its
 * input's `name` attribute as `${namePrefix}.${spec.key}` — so the two
 * compose into a real CSS attribute selector with no extra bookkeeping.
 *
 * Falls back in order: the named field's control -> the first focusable
 * control anywhere in the block's (already-open) field panel -> the
 * block row's own header toggle button, for block types where the field
 * can't be resolved this way (an `image`/`richtext`/`object`/`array`
 * field wraps a Controller-driven widget with no matching `name`
 * attribute — see CLAUDE.md's field-renderer.tsx notes — or the block
 * failed with no specific `field` at all, e.g. "Unknown block type").
 */
export function resolveBlockFocusTarget(
  container: ParentNode,
  options: { namePrefix: string; field?: string },
): HTMLElement | null {
  const fieldsPanel = container.querySelector<HTMLElement>("[data-block-fields]");

  if (options.field && fieldsPanel) {
    const named = fieldsPanel.querySelector<HTMLElement>(
      `[name="${cssEscape(`${options.namePrefix}.${options.field}`)}"]`,
    );
    if (named) return named;
  }

  if (fieldsPanel) {
    const firstFocusable = fieldsPanel.querySelector<HTMLElement>(
      'input, textarea, select, [contenteditable="true"]',
    );
    if (firstFocusable) return firstFocusable;
  }

  return container.querySelector<HTMLElement>("[data-block-toggle]");
}

/** Minimal `CSS.escape` fallback — field paths here are always `[a-zA-Z0-9_.]`-safe in practice, but this guards against a stray `"` breaking the selector outright. */
function cssEscape(value: string): string {
  return value.replace(/["\\]/g, "\\$&");
}

export type AutosaveDecision = "skip-disabled" | "skip-clean" | "skip-unchanged-failure" | "attempt";

/**
 * Whether an autosave tick should actually fire (brief item: "only when
 * the form currently passes client-side validation... don't autosave
 * known-invalid state"). This codebase has no real client-side schema to
 * pre-check against here: `BlockPaletteEntry` (lib/blocks/registry.ts's
 * `getBlockPalette()`) deliberately omits each block's Zod `schema` since
 * a `ZodType` isn't serializable across the server/client boundary (see
 * CLAUDE.md's Phase 5 section) — only `saveDraftAction`'s server-side
 * `validateBlockList` can actually validate a block's `data`. So "don't
 * autosave known-invalid state" is implemented here as "don't retry an
 * autosave against the exact same content that the last attempt already
 * came back invalid for" — the real validation still runs (autosave calls
 * the same saveDraftAction/save_page_draft_atomic path manual Save uses),
 * this just stops it from re-firing that same failure every few seconds
 * while the editor is looking at, but not yet changing, the broken field.
 * Once the content changes at all (a new `serializedValue`), autosave is
 * free to try again — it might now be valid, and if not, the (still
 * silent, non-intrusive) failure just gets recorded again.
 */
export function decideAutosave(input: {
  enabled: boolean;
  isDirty: boolean;
  serializedValue: string;
  lastFailedValue: string | null;
}): AutosaveDecision {
  if (!input.enabled) return "skip-disabled";
  if (!input.isDirty) return "skip-clean";
  if (input.lastFailedValue !== null && input.lastFailedValue === input.serializedValue) {
    return "skip-unchanged-failure";
  }
  return "attempt";
}
