"use client";

import { useEffect, useRef, useState, useTransition, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Controller, FormProvider, useFieldArray, useForm, useFormContext, useWatch } from "react-hook-form";
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
import { BlockPalettePicker } from "@/components/admin/block-palette-picker";
import { MediaPicker } from "@/components/admin/media-picker";
import {
  deletePageAction,
  duplicatePageAction,
  publishPageAction,
  restoreRevisionAction,
  saveDraftAction,
  unpublishPageAction,
} from "@/lib/actions/pages";
import { hasCapability } from "@/lib/auth/capabilities";
import type { AdminRole } from "@/lib/auth";
import type { BlockPaletteEntry } from "@/lib/blocks/registry";
import type { PageWithBlocks } from "@/lib/data/pages";
import type { Tables } from "@/lib/db/database.types";
import { PAGE_TEMPLATES } from "@/lib/validation/pages";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { AsyncMessage, type AsyncMessageState } from "@/components/admin/ui/async-message";
import { useConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { ReorderButtons } from "@/components/admin/ui/row-actions";
import { cloneBlockForDuplicate, decideAutosave, resolveBlockFocusTarget } from "@/lib/admin/block-editor-helpers";
import { useDebouncedCallback } from "@/lib/admin/use-debounced-callback";

// The page form mixes fixed page metadata with a `blocks` array whose
// `data` shape varies per block type (see FieldRenderer's comment) — no
// static type covers that, so the form itself is untyped here too.
/* eslint-disable @typescript-eslint/no-explicit-any */

/** Debounced autosave fires this long after the last edit — see lib/admin/use-debounced-callback.ts and decideAutosave. */
const AUTOSAVE_DELAY_MS = 4000;

type AutosaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export function PageEditor({
  page,
  palette,
  revisions,
  role,
}: {
  page: PageWithBlocks;
  palette: BlockPaletteEntry[];
  revisions: Tables<"page_revisions">[];
  role: AdminRole;
}) {
  const canPublish = hasCapability(role, "publish");
  const canDelete = hasCapability(role, "delete_content");
  const canEditDrafts = hasCapability(role, "edit_drafts");
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [isPublishing, startPublishing] = useTransition();
  const [status, setStatus] = useState(page.status);
  const [version, setVersion] = useState(page.draft_version);
  const [banner, setBanner] = useState<{ kind: "success" | "error"; message: string; conflict?: boolean } | null>(
    null,
  );
  const { confirm, prompt, dialog } = useConfirmDialog();

  // Declared up front (used by onSaveDraft/onPublish below, and by the
  // debounced autosave block further down) — see that block's comment for
  // what these track. Plain component state, not refs: `decideAutosave`
  // reads `lastFailedAutosaveValue` during render to decide whether to
  // schedule the next attempt, and this codebase's lint rules forbid
  // reading a ref's `.current` during render (only inside an effect/
  // callback, after commit) — see AutosaveIndicator's derivation below for
  // why `isAutosaving` is separate from the "idle"/"saved"/"error" outcome.
  const [autosaveOutcome, setAutosaveOutcome] = useState<"idle" | "saved" | "error">("idle");
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [lastFailedAutosaveValue, setLastFailedAutosaveValue] = useState<string | null>(null);

  const paletteByType = Object.fromEntries(palette.map((p) => [p.type, p]));

  const form = useForm<any>({
    defaultValues: {
      title: page.title,
      slug: page.slug,
      locale: page.locale,
      template: page.template,
      seo_title: page.seo_title ?? "",
      seo_description: page.seo_description ?? "",
      og_image_url: page.og_image_url ?? "",
      noindex: page.noindex,
      blocks: page.blocks.map((b) => ({ type: b.type, is_visible: b.is_visible, data: b.data })),
    },
  });

  const { control, register, handleSubmit, getValues } = form;
  const { isDirty } = form.formState;
  const { fields, append, insert, remove, move, update } = useFieldArray({ control, name: "blocks" });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Keyboard reordering (brief item: dnd-kit KeyboardSensor) — Tab to a
    // block's drag handle, Space to pick it up, Arrow keys to move,
    // Space/Enter to drop, Escape to cancel. sortableKeyboardCoordinates
    // is dnd-kit's own coordinate getter for a vertical sortable list.
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

  function buildMeta(values: any) {
    return {
      title: values.title,
      slug: values.slug,
      locale: values.locale,
      template: values.template,
      seo_title: values.seo_title || null,
      seo_description: values.seo_description || null,
      og_image_url: values.og_image_url || null,
      noindex: values.noindex,
    };
  }

  function saveDraft(values: any) {
    return saveDraftAction(page.id, buildMeta(values), values.blocks, version);
  }

  // --- Scroll-to/focus-the-failed-block (brief item 1) --------------------
  // Rows are opened via a controlled Set<field id> (not each row's own
  // useState) precisely so a validation failure can force one open from
  // here; keyed by react-hook-form's own stable field id (not array
  // index) so an already-open row stays open/matched to the right block
  // across a drag/keyboard reorder, duplicate, or remove — all of which
  // shift indices but never that id. blockRowRefs is keyed by the
  // *current* render's index instead, which is fine: it's only ever read
  // synchronously right after a save's result comes back, using that same
  // save attempt's blockIndex, with no reorder possible in between.
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const blockRowRefs = useRef(new Map<number, HTMLDivElement>());
  // Plain state, not a ref: `revealValidationTarget` is called from deep
  // inside `handleSubmit(...)`'s callback (onSaveDraft/onPublish below),
  // and this codebase's lint rules flag *any* ref access reachable from a
  // closure built during render, even one only ever invoked later as an
  // event handler — see the block-editor-helpers.ts import comment for
  // why per-field targeting still works without a ref here: a fresh
  // `{ index, field }` object is set on every call (even a repeat failure
  // on the same block/field), so the effect below — whose dependency is
  // that whole object — re-runs on `Object.is` identity, not deep
  // equality, with no extra "attempt id"/nonce bookkeeping needed. There's
  // also no need to reset it back to `null` once handled: leaving the last
  // value in place causes no repeat scrolling, since the effect only ever
  // re-fires when a *new* object is set.
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

  /** Opens and queues a scroll/focus for the block a SaveResult points at — a no-op if the result carried no blockIndex (e.g. a page-meta-only validation error, which the banner alone already covers). */
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

  // --- Manual save/publish -------------------------------------------------

  const onSaveDraft = handleSubmit((values) => {
    startSaving(async () => {
      const result = await saveDraft(values);
      if (result.status === "error") {
        setBanner({ kind: "error", message: result.message, conflict: result.conflict });
        revealValidationTarget(result);
        if (!result.conflict) setLastFailedAutosaveValue(JSON.stringify(values));
      } else {
        setVersion(result.newVersion);
        setBanner({ kind: "success", message: "Draft saved." });
        setLastFailedAutosaveValue(null);
        setAutosaveOutcome("saved");
        // Resets react-hook-form's dirty-comparison baseline to what was
        // just saved, keeping the currently displayed values untouched —
        // needed for the unsaved-changes guard (beforeunload/back-link)
        // and the autosave status indicator to mean "since the last save,"
        // not "since the page first loaded."
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
      const publishResult = await publishPageAction(page.id, saveResult.newVersion);
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
      await unpublishPageAction(page.id);
      setStatus("draft");
      router.refresh();
    });
  }

  async function onDuplicate() {
    const newSlug = await prompt({
      title: "Duplicate page",
      label: "Slug for the duplicate",
      defaultValue: `${getValues("slug")}-copy`,
      validate: (value) => (value.trim() ? null : "Slug is required"),
    });
    if (!newSlug) return;
    startSaving(async () => {
      const result = await duplicatePageAction(page.id, newSlug);
      if ("error" in result) {
        setBanner({ kind: "error", message: result.error });
      } else {
        router.push(`/admin/pages/${result.id}`);
      }
    });
  }

  async function onDelete() {
    const ok = await confirm({
      title: `Delete "${page.title}"?`,
      message: "This cannot be undone.",
      tone: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startSaving(async () => {
      await deletePageAction(page.id);
    });
  }

  async function onRestoreRevision(revisionId: string) {
    const ok = await confirm({
      title: "Restore this revision?",
      message: "Unsaved changes will be lost.",
      confirmLabel: "Restore",
    });
    if (!ok) return;
    startSaving(async () => {
      const result = await restoreRevisionAction(page.id, revisionId, version);
      if (result.status === "error") {
        setBanner({ kind: "error", message: result.message, conflict: result.conflict });
        return;
      }
      router.refresh();
      window.location.reload();
    });
  }

  function addBlock(entry: BlockPaletteEntry) {
    append({ type: entry.type, is_visible: true, data: entry.defaults });
  }

  /** Duplicate-near-source (brief item 2): inserted right after the source, never appended to the end. */
  function duplicateBlockAt(index: number) {
    const source = fields[index] as any;
    // Built explicitly (type/is_visible/data only) rather than spreading
    // `source` — react-hook-form's own `id` key on the field-array entry
    // gets overwritten either way when it computes `fields`, but there's
    // no reason to carry it into the new block's stored value at all.
    insert(index + 1, cloneBlockForDuplicate({ type: source.type, is_visible: source.is_visible, data: source.data }));
  }

  // --- Unsaved-changes guard (brief item 4) --------------------------------
  // beforeunload covers tab-close/refresh, which is the well-supported,
  // standard part of this guard. In-app navigation is only intercepted for
  // this page's own back link (below) — Next.js 16's App Router has no
  // global "block navigation" hook the way the old Pages Router's
  // route-change events did, and a history/router monkey-patch to catch
  // arbitrary link clicks elsewhere in the app was judged too fragile to
  // build for this task (see docs/DECISIONS.md).
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
      message: "You have edits on this page that haven't been saved yet. Leaving now will discard them.",
      tone: "danger",
      confirmLabel: "Discard and leave",
    });
    if (ok) router.push("/admin/pages");
  }

  // --- Preview staleness warning (brief item 5) ----------------------------
  // The preview route itself (app/(site)/preview/[...slug]/page.tsx)
  // already banners "reflects the last saved draft, not unsaved edits" —
  // the gap this closes is entirely upstream of that: warning *before*
  // the editor opens a preview that won't show what's currently on screen.
  async function handlePreviewClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!isDirty) return;
    event.preventDefault();
    const ok = await confirm({
      title: "Preview shows the last saved draft",
      message: "You have unsaved edits — the preview won't reflect them until you save.",
      confirmLabel: "Open preview anyway",
    });
    if (ok) window.open(`/preview/${page.slug}`, "_blank", "noopener,noreferrer");
  }

  // --- Debounced autosave (brief item 4, second half) ----------------------
  // Calls the exact same saveDraft()/saveDraftAction()/save_page_draft_atomic
  // path the manual "Save draft" button above already uses — this is an
  // additional automatic caller of that action, never a second/parallel
  // save code path. See decideAutosave's doc comment for what "only when
  // it passes client-side validation" means in a registry where block
  // schemas are deliberately never shipped to the client.
  const watchedValues = useWatch({ control });
  const serializedValues = JSON.stringify(watchedValues);

  // Purely derived, not stored — "Unsaved changes" the instant a keystroke
  // makes the form dirty again, "Saving…" while a request is in flight,
  // otherwise whatever the last attempt (manual or auto) actually
  // concluded. No effect needed to keep this in sync.
  const autosaveDisplayStatus: AutosaveStatus = isAutosaving ? "saving" : isDirty ? "dirty" : autosaveOutcome;

  const autosaveDecision = decideAutosave({
    enabled: canEditDrafts && !isSaving && !isPublishing && !isAutosaving,
    isDirty,
    serializedValue: serializedValues,
    lastFailedValue: lastFailedAutosaveValue,
  });

  useDebouncedCallback({
    watchKey: serializedValues,
    delayMs: AUTOSAVE_DELAY_MS,
    enabled: autosaveDecision === "attempt",
    callback: () => {
      const values = getValues();
      const serializedAtAttempt = serializedValues;
      setIsAutosaving(true);
      void (async () => {
        const result = await saveDraft(values);
        setIsAutosaving(false);
        if (result.status === "error") {
          setLastFailedAutosaveValue(serializedAtAttempt);
          if (result.conflict) {
            // The conflict banner is the canonical "something went wrong"
            // surface for this — defer to it instead of duplicating the
            // message in the small status indicator too.
            setBanner({ kind: "error", message: result.message, conflict: true });
          } else {
            setAutosaveOutcome("error");
          }
        } else {
          setLastFailedAutosaveValue(null);
          setVersion(result.newVersion);
          form.reset(values, { keepValues: true, keepDirty: false });
          setAutosaveOutcome("saved");
        }
      })();
    },
  });

  const bannerMessage: AsyncMessageState = banner ? { kind: banner.kind, text: banner.message } : null;

  return (
    <FormProvider {...form}>
      <div className="space-y-6 pb-24">
        <AdminPageHeader
          backHref="/admin/pages"
          backLabel="Pages"
          onBackClick={handleBackClick}
          title={page.title}
          actions={
            <>
              <StatusBadge label={status} />
              <AutosaveIndicator status={autosaveDisplayStatus} />
              <a
                href={`/preview/${page.slug}`}
                target="_blank"
                rel="noreferrer"
                onClick={handlePreviewClick}
                className="rounded border border-osi-navy-900 px-3 py-1.5 text-xs uppercase tracking-wide-label"
              >
                Preview
              </a>
              <button
                type="button"
                onClick={onSaveDraft}
                disabled={isSaving}
                className="rounded border border-osi-navy-900 px-3 py-1.5 text-xs uppercase tracking-wide-label disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Save draft"}
              </button>
              {canPublish &&
                (status === "published" ? (
                  <button
                    type="button"
                    onClick={onUnpublish}
                    disabled={isPublishing}
                    className="rounded bg-osi-navy-900 px-3 py-1.5 text-xs uppercase tracking-wide-label text-osi-white disabled:opacity-50"
                  >
                    Unpublish
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onPublish}
                    disabled={isPublishing}
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
                    onToggleVisible={() => update(index, { ...(field as any), is_visible: !(field as any).is_visible })}
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

            <BlockPalettePicker entries={palette} onAdd={addBlock} />
          </div>

          <aside className="space-y-6">
            <section className="space-y-3 rounded border border-osi-sand-300 bg-osi-white p-4">
              <h2 className="font-display text-xs tracking-wide-display uppercase opacity-70">Page settings</h2>
              <label className="block space-y-1 text-sm">
                <span className="block text-xs uppercase tracking-wide-label opacity-70">Title</span>
                <input {...register("title")} className="w-full rounded border border-osi-sand-300 px-3 py-2 text-sm" />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="block text-xs uppercase tracking-wide-label opacity-70">Slug</span>
                <input {...register("slug")} className="w-full rounded border border-osi-sand-300 px-3 py-2 text-sm" />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="block text-xs uppercase tracking-wide-label opacity-70">Starting point</span>
                <select {...register("template")} className="w-full rounded border border-osi-sand-300 px-3 py-2 text-sm">
                  {PAGE_TEMPLATES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
                <span className="block text-xs opacity-50">
                  Only affects which blocks were added when this page was first created.
                </span>
              </label>
            </section>

            <section className="space-y-3 rounded border border-osi-sand-300 bg-osi-white p-4">
              <h2 className="font-display text-xs tracking-wide-display uppercase opacity-70">SEO</h2>
              <label className="block space-y-1 text-sm">
                <span className="block text-xs uppercase tracking-wide-label opacity-70">SEO title</span>
                <input {...register("seo_title")} className="w-full rounded border border-osi-sand-300 px-3 py-2 text-sm" />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="block text-xs uppercase tracking-wide-label opacity-70">SEO description</span>
                <textarea
                  {...register("seo_description")}
                  rows={3}
                  className="w-full rounded border border-osi-sand-300 px-3 py-2 text-sm"
                />
              </label>
              <div className="space-y-1 text-sm">
                <span className="block text-xs uppercase tracking-wide-label opacity-70">Social image</span>
                <SocialImageField />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("noindex")} className="h-4 w-4" />
                Hide from search engines (noindex)
              </label>
            </section>

            {!page.is_system && (
              <section className="space-y-2 rounded border border-osi-sand-300 bg-osi-white p-4">
                <h2 className="font-display text-xs tracking-wide-display uppercase opacity-70">Danger zone</h2>
                <button type="button" onClick={onDuplicate} className="block text-sm hover:underline">
                  Duplicate page
                </button>
                {canDelete && (
                  <button type="button" onClick={onDelete} className="block text-sm text-red-600 hover:underline">
                    Delete page
                  </button>
                )}
              </section>
            )}

            {revisions.length > 0 && (
              <section className="space-y-2 rounded border border-osi-sand-300 bg-osi-white p-4">
                <h2 className="font-display text-xs tracking-wide-display uppercase opacity-70">
                  Revisions ({revisions.length})
                </h2>
                <ul className="space-y-1 text-xs">
                  {revisions.map((rev) => (
                    <li key={rev.id} className="flex items-center justify-between">
                      <span className="opacity-70">{new Date(rev.created_at).toLocaleString()}</span>
                      <button type="button" onClick={() => onRestoreRevision(rev.id)} className="hover:underline">
                        Restore
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </aside>
        </div>
      </div>
      {dialog}
    </FormProvider>
  );
}

/** The small persistent status line next to Save draft — "Saving…" / "Saved" / "Unsaved changes"; a non-conflict autosave failure gets its own quiet text rather than the big error banner (a conflict still uses that banner, set by the caller). */
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

function SocialImageField() {
  const { control } = useFormContext<any>();
  return (
    <Controller
      control={control}
      name="og_image_url"
      render={({ field }) => <MediaPicker value={field.value} onChange={field.onChange} label="social image" />}
    />
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
        <ReorderButtons onMoveUp={onMoveUp} onMoveDown={onMoveDown} disableUp={isFirst} disableDown={isLast} />
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
