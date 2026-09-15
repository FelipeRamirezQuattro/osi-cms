"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormProvider, useFieldArray, useForm } from "react-hook-form";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
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

// Same reasoning as page-editor.tsx: `blocks` mixes fixed shape (type,
// is_visible) with a per-block-type `data` shape no static type covers.
/* eslint-disable @typescript-eslint/no-explicit-any */

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
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [isPublishing, startPublishing] = useTransition();
  const [status, setStatus] = useState(section.status);
  const [version, setVersion] = useState(section.draft_version);
  const [banner, setBanner] = useState<{ kind: "success" | "error"; message: string; conflict?: boolean } | null>(
    null,
  );
  const [addType, setAddType] = useState(palette[0]?.type ?? "");

  const paletteByType = Object.fromEntries(palette.map((p) => [p.type, p]));

  const form = useForm<any>({
    defaultValues: {
      title: section.title,
      blocks: section.blocks.map((b) => ({ type: b.type, is_visible: b.is_visible, data: b.data })),
    },
  });

  const { control, register, handleSubmit } = form;
  const { fields, append, remove, move, update } = useFieldArray({ control, name: "blocks" });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

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

  const onSaveDraft = handleSubmit((values) => {
    startSaving(async () => {
      const result = await saveDraft(values);
      if (result.status === "error") {
        setBanner({ kind: "error", message: result.message, conflict: result.conflict });
      } else {
        setVersion(result.newVersion);
        setBanner({ kind: "success", message: "Draft saved." });
        router.refresh();
      }
    });
  });

  const onPublish = handleSubmit((values) => {
    startPublishing(async () => {
      const saveResult = await saveDraft(values);
      if (saveResult.status === "error") {
        setBanner({ kind: "error", message: saveResult.message, conflict: saveResult.conflict });
        return;
      }
      setVersion(saveResult.newVersion);
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

  function onDelete() {
    if (!window.confirm(`Delete "${section.title}"? This cannot be undone.`)) return;
    startSaving(async () => {
      await deleteSharedSectionAction(section.id);
    });
  }

  function addBlock() {
    const entry = paletteByType[addType];
    if (!entry) return;
    append({ type: entry.type, is_visible: true, data: entry.defaults });
  }

  return (
    <FormProvider {...form}>
      <div className="space-y-6 pb-24">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/admin/shared-sections" className="text-xs opacity-60 hover:underline">
              ← Shared sections
            </Link>
            <h1 className="font-display text-lg tracking-wide-display uppercase">{section.title}</h1>
            <p className="text-xs opacity-50">key: {section.key}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={
                status === "published"
                  ? "rounded bg-green-100 px-2 py-0.5 text-xs text-green-800"
                  : "rounded bg-osi-sand-300/50 px-2 py-0.5 text-xs opacity-70"
              }
            >
              {status}
            </span>
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
          </div>
        </div>

        {banner && (
          <div className="flex items-center gap-3">
            <p className={banner.kind === "error" ? "text-sm text-red-600" : "text-sm text-green-700"}>
              {banner.message}
            </p>
            {banner.conflict && (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded border border-red-600 px-2 py-1 text-xs uppercase tracking-wide-label text-red-600"
              >
                Reload page
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                {fields.map((field, index) => (
                  <SortableBlockRow
                    key={field.id}
                    id={field.id}
                    index={index}
                    typeLabel={paletteByType[(field as any).type]?.label ?? (field as any).type}
                    definition={paletteByType[(field as any).type]}
                    isVisible={(field as any).is_visible}
                    onToggleVisible={() => update(index, { ...(field as any), is_visible: !(field as any).is_visible })}
                    onRemove={() => remove(index)}
                    onDuplicate={() => append({ ...(field as any) })}
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
                <input {...register("title")} className="w-full rounded border border-osi-sand-300 px-3 py-2 text-sm" />
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
    </FormProvider>
  );
}

function SortableBlockRow({
  id,
  index,
  typeLabel,
  definition,
  isVisible,
  onToggleVisible,
  onRemove,
  onDuplicate,
}: {
  id: string;
  index: number;
  typeLabel: string;
  definition: BlockPaletteEntry | undefined;
  isVisible: boolean;
  onToggleVisible: () => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="rounded border border-osi-sand-300 bg-osi-white">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="cursor-grab px-1 text-osi-slate-400"
          aria-label="Drag to reorder"
        >
          ⠿
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex-1 text-left text-sm font-medium">
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
      {open && definition && (
        <div className="border-t border-osi-sand-300 p-4">
          <BlockFieldsForm definition={definition} namePrefix={`blocks.${index}.data`} />
        </div>
      )}
    </div>
  );
}
