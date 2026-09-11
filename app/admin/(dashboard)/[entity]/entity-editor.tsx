"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { FieldRenderer } from "@/components/admin/field-renderer";
import { RelationOptionsProvider, type RelationOptionsMap } from "@/components/admin/relation-options";
import { deleteEntityAction, saveEntityAction } from "@/lib/actions/entities";
import type { EntityConfig, EntityKey } from "@/lib/admin/entity-config";
import type { EntityRow } from "@/lib/data/admin-entities";

// Same reasoning as field-renderer.tsx / page-editor.tsx: the form shape
// is a different flat object per entity, described at runtime by
// EntityConfig.fields — no static type to give react-hook-form.
/* eslint-disable @typescript-eslint/no-explicit-any */

export function EntityEditor({
  entity,
  config,
  row,
  relationOptions,
}: {
  entity: EntityKey;
  config: EntityConfig;
  row: EntityRow | null;
  relationOptions: RelationOptionsMap;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<any>({
    defaultValues: row ?? config.defaults,
  });

  function onSubmit(values: any) {
    setError(null);
    startTransition(async () => {
      const result = await saveEntityAction(entity, row?.id ?? null, values);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      router.push(`/admin/${entity}`);
      router.refresh();
    });
  }

  function onDelete() {
    if (!row) return;
    if (!window.confirm(`Delete this ${config.label.toLowerCase()}? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteEntityAction(entity, row.id);
    });
  }

  return (
    <FormProvider {...form}>
      <RelationOptionsProvider options={relationOptions}>
        <div className="max-w-2xl space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-lg tracking-wide-display uppercase">
              {row ? `Edit ${config.label.toLowerCase()}` : `New ${config.label.toLowerCase()}`}
            </h1>
            {row && (
              <button type="button" onClick={onDelete} className="text-xs text-red-600 hover:underline">
                Delete
              </button>
            )}
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 rounded border border-osi-sand-300 bg-osi-white p-5">
            {config.fields.map((field) => (
              <FieldRenderer key={field.key} spec={field} name={field.key} />
            ))}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={isPending}
              className="rounded bg-osi-navy-900 px-4 py-2 text-xs uppercase tracking-wide-label text-osi-white disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          </form>
        </div>
      </RelationOptionsProvider>
    </FormProvider>
  );
}
