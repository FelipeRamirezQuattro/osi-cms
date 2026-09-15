"use client";

import { useEffect, useRef, useState, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import {
  DndContext,
  KeyboardSensor,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { BlockFieldsForm } from "@/components/admin/block-fields-form";
import {
  deleteSharedSectionAction,
  publishSharedSectionAction,
  saveSharedSectionDraftAction,
  unpublishSharedSectionAction,
} from "@/lib/actions/shared-sections";
import { hasCapability } from "@/lib/auth/capabilities";
import type { AdminRole } from "@/lib/auth";
import type { BlockPaletteEntry } from "@/lib/blocks/registry";
import type { SharedSectionWithBlocks } from "@/lib/data/shared-sections";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { AsyncMessage, type AsyncMessageState } from "@/components/admin/ui/async-message";
import { useConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { ReorderButtons } from "@/components/admin/ui/row-actions";
import {
  cloneBlockForDuplicate,
  decideAutosave,
  deriveAutosaveDisplayStatus,
  isManualSaveActionBlocked,
  resolveBlockFocusTarget,
  shouldTrackFailedAutosaveValue,
  type AutosaveStatus,
} from "@/lib/admin/block-editor-helpers";

// Same reasoning as page-editor.tsx: `blocks` mixes fixed shape (type,
// is_visible) with a per-block-type `data` shape no static type covers.
/* eslint-disable @typescript-eslint/no-explicit-any */

/** Same debounce window as page-editor.tsx — see that file's AUTOSAVE_DELAY_MS comment. */
const AUTOSAVE_DELAY_MS = 4000;

export function SharedSectionEditor({
  section,
  palette,
  role,
}: {
  section: SharedSectionWithBlocks;
  palette: BlockPaletteEntry[];
  role: AdminRole;
}) {
  const canPublish = hasCapability(role, "publish");
  const canDelete = hasCapability(role, "delete_content");
  const canEditDrafts = hasCapability(role, "edit_drafts");
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [isPublishing, startPublishing] = useTransition();
  const [status, setStatus] = useState(section.status);
  const [version, setVersion] = useState(section.draft_version);
  const [banner, setBanner] = useState<{ kind: "success" | "error"; message: string; conflict?: boolean } | null>(
    null,
  );
  const [addType, setAddType] = useState(palette[0]?.type ?? "");
  const { confirm, dialog } = useConfirmDialog();

  // See page-editor.tsx's identical declarations for why these are plain
  // state rather than refs (decideAutosave reads lastFailedAutosaveValue
  // during render, which this codebase's lint rules forbid for a ref).
  const [autosaveOutcome, setAutosaveOutcome] = useState<"idle" | "saved" | "error">("idle");
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [lastFailedAutosaveValue, setLastFailedAutosaveValue] = useState<string | null>(null);

  const paletteByType = Object.fromEntries(palette.map((p) => [p.type, p]));

  const form = useForm<any>({
    defaultValues: {
      title: section.title,
      blocks: section.blocks.map((b) => ({ type: b.type, is_visible: b.is_visible, data: b.data })),
    },
  });

  const { control, register, handleSubmit, getValues } = form;
  const { isDirty } = form.formState;
  const { fields, append, insert, remove, move, update } = useFieldArray({ control, name: "blocks" });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Keyboard reordering — see page-editor.tsx's identical sensor setup.
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.id === active.id);
    const newIndex = fields.findIndex((f) => f.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    move(oldIndex, newIndex);
  }

  function saveDraft(values: any) {
    return saveSharedSectionDraftAction(section.id, values.title, values.blocks, version);
  }

  // --- Scroll-to/focus-the-failed-block — see page-editor.tsx's identical block for the full rationale.
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const blockRowRefs = useRef(new Map<number, HTMLDivElement>());
  // Plain state, not a ref — see page-editor.tsx's identical declaration
  // for why (revealValidationTarget is called from inside handleSubmit's
  // render-time-constructed closure, where this codebase's lint rules
  // forbid touching a ref even though it's only actually invoked later,
  // as an event handler).
  const [pendingFocus, setPendingFocus] = useState<{ index: number; field?: string } | null>(null);

  function registerBlockRowRef(index: number, el: HTMLDivElement | null) {
    if (el) blockRowRefs.current.set(index, el);
    else blockRowRefs.current.delete(index);
  }

  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function revealValidationTarget(result: { blockIndex?: number; field?: string }) {
    if (result.blockIndex === undefined) return;
    const fieldId = fields[result.blockIndex]?.id;
    if (fieldId) setOpenIds((prev) => new Set(prev).add(fieldId));
    setPendingFocus({ index: result.blockIndex, field: result.field });
  }

  useEffect(() => {
    if (!pendingFocus) return;
    const container = blockRowRefs.current.get(pendingFocus.index);
    if (!container) return;
    container.scrollIntoView({ behavior: "smooth", block: "center" });
    const target = resolveBlockFocusTarget(container, {
      namePrefix: `blocks.${pendingFocus.index}.data`,
      field: pendingFocus.field,
    });
    target?.focus();
  }, [pendingFocus]);

  const onSaveDraft = handleSubmit((values) => {
    startSaving(async () => {
      const result = await saveDraft(values);
      if (result.status === "error") {
        setBanner({ kind: "error", message: result.message, conflict: result.conflict });
        revealValidationTarget(result);
        if (shouldTrackFailedAutosaveValue(result)) setLastFailedAutosaveValue(JSON.stringify(values));
      } else {
        setVersion(result.newVersion);
        setBanner({ kind: "success", message: "Draft saved." });
        setLastFailedAutosaveValue(null);
        setAutosaveOutcome("saved");
        form.reset(values, { keepValues: true, keepDirty: false });
        router.refresh();
      }
    });
  });

  const onPublish = handleSubmit((values) => {
    startPublishing(async () => {
      const saveResult = await saveDraft(values);
      if (saveResult.status === "error") {
        setBanner({ kind: "error", message: saveResult.message, conflict: saveResult.conflict });
        revealValidationTarget(saveResult);
        return;
      }
      setVersion(saveResult.newVersion);
      form.reset(values, { keepValues: true, keepDirty: false });
      setLastFailedAutosaveValue(null);
      setAutosaveOutcome("saved");
      const publishResult = await publishSharedSectionAction(section.id, saveResult.newVersion);
      if (publishResult.status === "error") {
        setBanner({ kind: "error", message: publishResult.message, conflict: publishResult.conflict });
        return;
      }
      setStatus("published");
      setBanner({ kind: "success", message: "Published." });
      router.refresh();
    });
  });

  function onUnpublish() {
    startPublishing(async () => {
      await unpublishSharedSectionAction(section.id);
      setStatus("draft");
      router.refresh();
    });
  }

  async function onDelete() {
    const ok = await confirm({
      title: `Delete "${section.title}"?`,
      message: "This cannot be undone.",
      tone: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startSaving(async () => {
      await deleteSharedSectionAction(section.id);
    });
  }

  function addBlock() {
    const entry = paletteByType[addType];
    if (!entry) return;
    append({ type: entry.type, is_visible: true, data: entry.defaults });
  }

  /**
   * Duplicate-near-source — see page-editor.tsx's identical handler for the
   * full rationale. Reads the source via `getValues()`, not `fields[index]`
   * — `fields` is only refreshed by field-array actions, not by typing into
   * a registered input, so reading it here would silently duplicate the
   * block's pre-edit content (fix-round Finding 3).
   */
  function duplicateBlockAt(index: number) {
    const source = getValues(`blocks.${index}`) as any;
    insert(index + 1, cloneBlockForDuplicate({ type: source.type, is_visible: source.is_visible, data: source.data }));
  }

  /** Same stale-`fields[index]` bug as duplicateBlockAt above, same fix — see that comment. */
  function toggleBlockVisible(index: number) {
    const current = getValues(`blocks.${index}`) as any;
    update(index, { ...current, is_visible: !current.is_visible });
  }

  // --- Unsaved-changes guard — see page-editor.tsx's identical block for the in-app-navigation boundary note.
  useEffect(() => {
    if (!isDirty) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  async function handleBackClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!isDirty) return;
    event.preventDefault();
    const ok = await confirm({
      title: "Discard unsaved changes?",
      message: "You have edits on this shared section that haven't been saved yet. Leaving now will discard them.",
      tone: "danger",
      confirmLabel: "Discard and leave",
    });
    if (ok) router.push("/admin/shared-sections");
  }

  // --- Debounced autosave — see page-editor.tsx's identical block for the
  // full rationale (no separate preview route exists for shared sections,
  // so only the save-path half of that file's Task 13b work applies here),
  // including the fix-round Finding 2/4/5 rework: `form.subscribe` instead
  // of `useWatch`+`JSON.stringify` (Finding 4 — avoids re-rendering this
  // whole component, and every unmemoized SortableBlockRow under it, on
  // every keystroke), the reordered status ternary and stale-error reset
  // (Finding 2), and never recording a conflict into the skip-retry
  // tracking (Finding 5).
  const autosaveInputsRef = useRef({
    canEditDrafts,
    isSaving,
    isPublishing,
    isAutosaving,
    isDirty,
    lastFailedAutosaveValue,
    autosaveOutcome,
  });
  useEffect(() => {
    autosaveInputsRef.current = {
      canEditDrafts,
      isSaving,
      isPublishing,
      isAutosaving,
      isDirty,
      lastFailedAutosaveValue,
      autosaveOutcome,
    };
  });

  const runAutosaveAttemptRef = useRef<() => void>(() => {});
  useEffect(() => {
    runAutosaveAttemptRef.current = () => {
      const inputs = autosaveInputsRef.current;
      const values = getValues();
      const serializedAtAttempt = JSON.stringify(values);
      const decision = decideAutosave({
        enabled: inputs.canEditDrafts && !inputs.isSaving && !inputs.isPublishing && !inputs.isAutosaving,
        isDirty: inputs.isDirty,
        serializedValue: serializedAtAttempt,
        lastFailedValue: inputs.lastFailedAutosaveValue,
      });
      if (decision !== "attempt") return;
      setIsAutosaving(true);
      void (async () => {
        const result = await saveDraft(values);
        setIsAutosaving(false);
        if (result.status === "error") {
          if (shouldTrackFailedAutosaveValue(result)) {
            setLastFailedAutosaveValue(serializedAtAttempt);
            setAutosaveOutcome("error");
          } else {
            // fix-round Finding 5: never record a conflict into the
            // "already failed, skip retrying this content" tracking —
            // symmetric with the manual-save path above.
            setBanner({ kind: "error", message: result.message, conflict: true });
          }
        } else {
          setLastFailedAutosaveValue(null);
          setVersion(result.newVersion);
          form.reset(values, { keepValues: true, keepDirty: false });
          setAutosaveOutcome("saved");
        }
      })();
    };
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = form.subscribe({
      formState: { values: true },
      callback: () => {
        // fix-round Finding 2: clear a stale "Autosave failed" outcome the
        // instant content diverges from whatever last failed.
        const inputs = autosaveInputsRef.current;
        if (inputs.autosaveOutcome === "error") {
          const current = JSON.stringify(getValues());
          if (current !== inputs.lastFailedAutosaveValue) {
            setAutosaveOutcome("idle");
          }
        }
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => runAutosaveAttemptRef.current(), AUTOSAVE_DELAY_MS);
      },
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
    };
    // `form` is a stable reference for the component's lifetime — this subscribes once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // See deriveAutosaveDisplayStatus (fix-round Finding 2) for why the
  // error outcome must be checked before `isDirty`.
  const autosaveDisplayStatus: AutosaveStatus = deriveAutosaveDisplayStatus({ isAutosaving, isDirty, autosaveOutcome });

  const bannerMessage: AsyncMessageState = banner ? { kind: banner.kind, text: banner.message } : null;

  return (
    <FormProvider {...form}>
      <div className="space-y-6 pb-24">
        <AdminPageHeader
          backHref="/admin/shared-sections"
          backLabel="Shared sections"
          onBackClick={handleBackClick}
          title={section.title}
          subtitle={`key: ${section.key}`}
          actions={
            <>
              <StatusBadge label={status} />
              <AutosaveIndicator status={autosaveDisplayStatus} />
              <button
                type="button"
                onClick={onSaveDraft}
                // fix-round Finding 1 (CRITICAL) — see
                // isManualSaveActionBlocked's doc comment: a manual save
                // must never fire while an autosave is already in flight.
                disabled={isManualSaveActionBlocked({ actionInFlight: isSaving, isAutosaving })}
                className="rounded border border-osi-navy-900 px-3 py-1.5 text-xs uppercase tracking-wide-label disabled:opacity-50"
              >
                {isSaving || isAutosaving ? "Saving…" : "Save draft"}
              </button>
              {canPublish &&
                (status === "published" ? (
                  <button
                    type="button"
                    onClick={onUnpublish}
                    disabled={isManualSaveActionBlocked({ actionInFlight: isPublishing, isAutosaving })}
                    className="rounded bg-osi-navy-900 px-3 py-1.5 text-xs uppercase tracking-wide-label text-osi-white disabled:opacity-50"
                  >
                    Unpublish
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onPublish}
                    disabled={isManualSaveActionBlocked({ actionInFlight: isPublishing, isAutosaving })}
                    className="rounded bg-osi-gold-500 px-3 py-1.5 text-xs uppercase tracking-wide-label text-osi-navy-900 disabled:opacity-50"
                  >
                    {isPublishing ? "Publishing…" : "Publish"}
                  </button>
                ))}
            </>
          }
        />

        <AsyncMessage
          message={bannerMessage}
          action={
            banner?.conflict && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded border border-red-600 px-2 py-1 text-xs uppercase tracking-wide-label text-red-600"
              >
                Reload page
              </button>
            )
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                {fields.map((field, index) => (
                  <SortableBlockRow
                    key={field.id}
                    id={field.id}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === fields.length - 1}
                    typeLabel={paletteByType[(field as any).type]?.label ?? (field as any).type}
                    definition={paletteByType[(field as any).type]}
                    isVisible={(field as any).is_visible}
                    isOpen={openIds.has(field.id)}
                    onToggleOpen={() => toggleOpen(field.id)}
                    onToggleVisible={() => toggleBlockVisible(index)}
                    onRemove={() => remove(index)}
                    onDuplicate={() => duplicateBlockAt(index)}
                    onMoveUp={() => move(index, index - 1)}
                    onMoveDown={() => move(index, index + 1)}
                    registerRef={registerBlockRowRef}
                  />
                ))}
              </SortableContext>
            </DndContext>
            {fields.length === 0 && (
              <p className="rounded border border-dashed border-osi-sand-300 p-6 text-center text-sm text-osi-slate-400">
                No blocks yet — add one below.
              </p>
            )}

            <div className="rounded border border-osi-sand-300 bg-osi-white p-3">
              <div className="flex items-center gap-2">
                <select
                  value={addType}
                  onChange={(e) => setAddType(e.target.value)}
                  className="rounded border border-osi-sand-300 px-3 py-2 text-sm"
                >
                  {["hero", "content", "commerce", "media", "forms", "layout"].map((category) => {
                    const entries = palette.filter((p) => p.category === category);
                    if (entries.length === 0) return null;
                    return (
                      <optgroup key={category} label={category}>
                        {entries.map((entry) => (
                          <option key={entry.type} value={entry.type} title={entry.description}>
                            {entry.label}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
                <button
                  type="button"
                  onClick={addBlock}
                  className="rounded bg-osi-navy-900 px-3 py-1.5 text-xs uppercase tracking-wide-label text-osi-white"
                >
                  + Add block
                </button>
              </div>
              {paletteByType[addType]?.description && (
                <p className="mt-2 text-xs text-osi-slate-400">{paletteByType[addType].description}</p>
              )}
            </div>
          </div>

          <aside className="space-y-6">
            <section className="space-y-3 rounded border border-osi-sand-300 bg-osi-white p-4">
              <h2 className="font-display text-xs tracking-wide-display uppercase opacity-70">Section settings</h2>
              <label className="block space-y-1 text-sm">
                <span className="block text-xs uppercase tracking-wide-label opacity-70">Title</span>
                <input
                  {...register("title")}
                  autoComplete="off"
                  className="w-full rounded border border-osi-sand-300 px-3 py-2 text-sm"
                />
                <span className="block text-xs opacity-50">Internal label only — never rendered on the public site.</span>
              </label>
            </section>

            <section className="space-y-2 rounded border border-osi-sand-300 bg-osi-white p-4">
              <h2 className="font-display text-xs tracking-wide-display uppercase opacity-70">Danger zone</h2>
              {canDelete && (
                <button type="button" onClick={onDelete} className="block text-sm text-red-600 hover:underline">
                  Delete shared section
                </button>
              )}
            </section>
          </aside>
        </div>
      </div>
      {dialog}
    </FormProvider>
  );
}

/** See page-editor.tsx's identical component for the state -> text mapping rationale. */
function AutosaveIndicator({ status }: { status: AutosaveStatus }) {
  if (status === "idle") return null;
  const text =
    status === "saving"
      ? "Saving…"
      : status === "saved"
        ? "Saved"
        : status === "error"
          ? "Autosave failed — save manually to see the error"
          : "Unsaved changes";
  return (
    <span
      role="status"
      aria-live="polite"
      className={`text-xs uppercase tracking-wide-label ${status === "error" ? "text-red-600" : "opacity-60"}`}
    >
      {text}
    </span>
  );
}

function SortableBlockRow({
  id,
  index,
  isFirst,
  isLast,
  typeLabel,
  definition,
  isVisible,
  isOpen,
  onToggleOpen,
  onToggleVisible,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  registerRef,
}: {
  id: string;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  typeLabel: string;
  definition: BlockPaletteEntry | undefined;
  isVisible: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
  onToggleVisible: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  registerRef: (index: number, el: HTMLDivElement | null) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  function setRefs(el: HTMLDivElement | null) {
    setNodeRef(el);
    registerRef(index, el);
  }

  return (
    <div ref={setRefs} style={style} className="rounded border border-osi-sand-300 bg-osi-white">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab px-1 text-osi-slate-400"
          aria-label={`Drag to reorder ${typeLabel} (or focus and use arrow keys)`}
        >
          ⠿
        </button>
        <ReorderButtons
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          disableUp={isFirst}
          disableDown={isLast}
          itemLabel={typeLabel}
        />
        <button
          type="button"
          data-block-toggle
          onClick={onToggleOpen}
          className="flex-1 text-left text-sm font-medium"
        >
          {typeLabel} {!isVisible && <span className="text-xs opacity-50">(hidden)</span>}
        </button>
        <button type="button" onClick={onToggleVisible} className="text-xs opacity-70 hover:underline">
          {isVisible ? "Hide" : "Show"}
        </button>
        <button type="button" onClick={onDuplicate} className="text-xs opacity-70 hover:underline">
          Duplicate
        </button>
        <button type="button" onClick={onRemove} className="text-xs text-red-600 hover:underline">
          Remove
        </button>
      </div>
      {isOpen && definition && (
        <div data-block-fields className="border-t border-osi-sand-300 p-4">
          <BlockFieldsForm definition={definition} namePrefix={`blocks.${index}.data`} />
        </div>
      )}
    </div>
  );
}
