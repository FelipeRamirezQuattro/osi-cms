"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { BlockFieldsForm } from "@/components/admin/block-fields-form";
import { FieldRenderer } from "@/components/admin/field-renderer";
import { BlockPalettePicker } from "@/components/admin/block-palette-picker";
import { ReorderButtons } from "@/components/admin/ui/row-actions";
import { markBlockInvalid, resolveBlockFocusTarget } from "@/lib/admin/block-editor-helpers";
import type { BlockPaletteEntry } from "@/lib/blocks/registry";
import type { FieldSpec } from "@/lib/blocks/admin-fields";
import { LINKED_SECTIONS, isLinkedSectionType } from "@/lib/products/layout";

const LINKED_FIELDS: FieldSpec[] = [
  { key: "title", label: "Heading (leave empty for no heading)", type: "text", optional: true },
  { key: "background", label: "Background", type: "select", options: ["navy", "cream"] },
];

// The product form is one untyped RHF instance, same as page-editor.tsx.
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The product editor's "Page layout": the ordered list of everything below the
 * hero. "Linked" rows stand in for the product's own sections (benefits,
 * stages, video, downloads, body, specs) — they can be moved, hidden and given
 * a heading, but not removed, and their content is edited in the form below.
 * The rest are ordinary blocks (same fields form as the page editor) for
 * content the product structure can't hold. Plain up/down reordering.
 */
export type ProductBlocksHandle = {
  /** Opens the block a save problem points at, scrolls to it, focuses the field and outlines it. */
  reveal: (problem: { blockIndex?: number; field?: string }) => void;
};

export const ProductBlocksField = forwardRef<ProductBlocksHandle, { palette: BlockPaletteEntry[] }>(function ProductBlocksField(
  { palette },
  ref,
) {
  const { control, setValue } = useFormContext<any>();
  const { fields, append, remove, move } = useFieldArray({ control, name: "blocks" });
  const watched: { type: string; is_visible: boolean }[] = useWatch({ control, name: "blocks" }) ?? [];
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const paletteByType = Object.fromEntries(palette.map((p) => [p.type, p]));
  const listRef = useRef<HTMLUListElement>(null);
  // Plain state (a fresh object per call) so the effect re-fires even for a repeat failure on the same block.
  const [pendingFocus, setPendingFocus] = useState<{ index: number; field?: string } | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      reveal: ({ blockIndex, field }) => {
        if (blockIndex === undefined) return;
        const id = fields[blockIndex]?.id;
        if (id) setOpenIds((prev) => new Set(prev).add(id));
        setPendingFocus({ index: blockIndex, field });
      },
    }),
    [fields],
  );

  useEffect(() => {
    if (!pendingFocus) return;
    const container = listRef.current?.children[pendingFocus.index] as HTMLElement | undefined;
    if (!container) return;
    container.scrollIntoView({ behavior: "smooth", block: "center" });
    const target = resolveBlockFocusTarget(container, { namePrefix: `blocks.${pendingFocus.index}.data`, field: pendingFocus.field });
    target?.focus();
    return markBlockInvalid(container, target);
  }, [pendingFocus]);

  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="space-y-3" aria-labelledby="product-blocks-heading">
      <div>
        <h2 id="product-blocks-heading" className="text-sm font-semibold">
          Page layout
        </h2>
        <p className="text-xs text-[var(--admin-ink-secondary)]">
          Everything below the product header, in the order shown on the page. Move the product&apos;s own sections
          (marked Linked) and add extra blocks — videos, images, text beside a video — between them.
        </p>
      </div>

            <ul ref={listRef} className="space-y-2">
        {fields.map((field, index) => {
          const type = watched[index]?.type ?? (field as any).type;
          const definition = paletteByType[type];
          const linked = isLinkedSectionType(type) ? LINKED_SECTIONS[type] : null;
          const label = linked?.label ?? definition?.label ?? type;
          const isVisible = watched[index]?.is_visible ?? true;
          const isOpen = openIds.has(field.id);
          return (
            <li key={field.id} data-block-row className="rounded border border-osi-sand-300 bg-osi-white">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2">
                <ReorderButtons
                  onMoveUp={() => move(index, index - 1)}
                  onMoveDown={() => move(index, index + 1)}
                  disableUp={index === 0}
                  disableDown={index === fields.length - 1}
                  itemLabel={label}
                />
                <button
                  type="button"
                  data-block-toggle
                  onClick={() => toggleOpen(field.id)}
                  aria-expanded={isOpen}
                  className="min-w-0 flex-1 basis-32 text-left text-sm font-medium"
                >
                  <span className="opacity-60">Block {index + 1}</span> · {label} {!isVisible && <span className="text-xs opacity-50">(hidden)</span>}
                </button>
                <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1">
                  <button
                    type="button"
                    onClick={() => setValue(`blocks.${index}.is_visible`, !isVisible, { shouldDirty: true })}
                    className="min-h-8 text-xs opacity-70 hover:underline"
                  >
                    {isVisible ? "Hide" : "Show"}
                  </button>
                  {linked ? (
                    <span className="text-xs opacity-60">Linked</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="min-h-8 text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              {isOpen && linked && (
                <div data-block-fields className="space-y-4 border-t border-osi-sand-300 p-4">
                  <p className="text-xs text-[var(--admin-ink-secondary)]">
                    The content of this section is edited in {linked.editedIn}. Hide it to keep it off the page; it cannot be removed.
                  </p>
                  {LINKED_FIELDS.map((spec) => (
                    <FieldRenderer key={spec.key} spec={spec} name={`blocks.${index}.data.${spec.key}`} />
                  ))}
                </div>
              )}
              {isOpen && !linked && definition && (
                <div data-block-fields className="border-t border-osi-sand-300 p-4">
                  <BlockFieldsForm definition={definition} namePrefix={`blocks.${index}.data`} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <BlockPalettePicker
        entries={palette}
        onAdd={(entry) => append({ type: entry.type, is_visible: true, data: entry.defaults })}
      />
    </section>
  );
});
