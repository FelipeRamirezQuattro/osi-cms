"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, FormProvider, useFieldArray, useForm, useFormContext } from "react-hook-form";
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
import { MediaPicker } from "@/components/admin/media-picker";
import {
  deletePageAction,
  duplicatePageAction,
  publishPageAction,
  restoreRevisionAction,
  saveDraftAction,
  unpublishPageAction,
} from "@/lib/actions/pages";
import type { BlockPaletteEntry } from "@/lib/blocks/registry";
import type { PageWithBlocks } from "@/lib/data/pages";
import type { Tables } from "@/lib/db/database.types";

// The page form mixes fixed page metadata with a `blocks` array whose
// `data` shape varies per block type (see FieldRenderer's comment) — no
// static type covers that, so the form itself is untyped here too.
/* eslint-disable @typescript-eslint/no-explicit-any */

const TEMPLATES = ["standard", "landing", "legal", "product", "contact"] as const;

export function PageEditor({
  page,
  palette,
  revisions,
}: {
  page: PageWithBlocks;
  palette: BlockPaletteEntry[];
  revisions: Tables<"page_revisions">[];
}) {
  const router = useRouter();
  const [isSaving, startSaving] = useTransition();
  const [isPublishing, startPublishing] = useTransition();
  const [status, setStatus] = useState(page.status);
  const [banner, setBanner] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [addType, setAddType] = useState(palette[0]?.type ?? "");

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
    return saveDraftAction(page.id, buildMeta(values), values.blocks);
  }

  const onSaveDraft = handleSubmit((values) => {
    startSaving(async () => {
      const result = await saveDraft(values);
      if (result.status === "error") {
        setBanner({ kind: "error", message: result.message });
      } else {
        setBanner({ kind: "success", message: "Draft saved." });
        router.refresh();
      }
    });
  });

  const onPublish = handleSubmit((values) => {
    startPublishing(async () => {
      const saveResult = await saveDraft(values);
      if (saveResult.status === "error") {
        setBanner({ kind: "error", message: saveResult.message });
        return;
      }
      const publishResult = await publishPageAction(page.id);
      if (publishResult.status === "error") {
        setBanner({ kind: "error", message: publishResult.message });
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

  function onDuplicate() {
    const newSlug = window.prompt("Slug for the duplicate:", `${getValues("slug")}-copy`);
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

  function onDelete() {
    if (!window.confirm(`Delete "${page.title}"? This cannot be undone.`)) return;
    startSaving(async () => {
      await deletePageAction(page.id);
    });
  }

  function onRestoreRevision(revisionId: string) {
    if (!window.confirm("Restore this revision? Unsaved changes will be lost.")) return;
    startSaving(async () => {
      await restoreRevisionAction(page.id, revisionId);
      router.refresh();
      window.location.reload();
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
            <Link href="/admin/pages" className="text-xs opacity-60 hover:underline">
              ← Pages
            </Link>
            <h1 className="font-display text-lg tracking-wide-display uppercase">{page.title}</h1>
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
            <a
              href={`/preview/${page.slug}`}
              target="_blank"
              rel="noreferrer"
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
            {status === "published" ? (
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
            )}
          </div>
        </div>

        {banner && (
          <p className={banner.kind === "error" ? "text-sm text-red-600" : "text-sm text-green-700"}>
            {banner.message}
          </p>
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

            <div className="flex items-center gap-2 rounded border border-osi-sand-300 bg-osi-white p-3">
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
                        <option key={entry.type} value={entry.type}>
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
                <span className="block text-xs uppercase tracking-wide-label opacity-70">Template</span>
                <select {...register("template")} className="w-full rounded border border-osi-sand-300 px-3 py-2 text-sm">
                  {TEMPLATES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
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
                <button type="button" onClick={onDelete} className="block text-sm text-red-600 hover:underline">
                  Delete page
                </button>
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
    </FormProvider>
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
