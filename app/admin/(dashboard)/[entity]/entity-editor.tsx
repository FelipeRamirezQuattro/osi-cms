"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { FieldRenderer } from "@/components/admin/field-renderer";
import { RelationOptionsProvider, type RelationOptionsMap } from "@/components/admin/relation-options";
import { deleteEntityAction, saveEntityAction } from "@/lib/actions/entities";
import { hasCapability } from "@/lib/auth/capabilities";
import type { AdminRole } from "@/lib/auth";
import type { EntityConfig, EntityKey } from "@/lib/admin/entity-config";
import type { EntityRow } from "@/lib/data/admin-entities";
import { FormCard, SubmitButton } from "@/components/admin/ui/form-card";
import { AsyncMessage } from "@/components/admin/ui/async-message";
import { useConfirmDialog } from "@/components/admin/ui/confirm-dialog";

// Same reasoning as field-renderer.tsx / page-editor.tsx: the form shape
// is a different flat object per entity, described at runtime by
// EntityConfig.fields — no static type to give react-hook-form.
/* eslint-disable @typescript-eslint/no-explicit-any */

export function EntityEditor({
  entity,
  config,
  row,
  relationOptions,
  role = "editor",
}: {
  entity: EntityKey;
  config: EntityConfig;
  row: EntityRow | null;
  relationOptions: RelationOptionsMap;
  role?: AdminRole;
}) {
  const canDelete = hasCapability(role, "delete_content");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

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

  async function onDelete() {
    if (!row) return;
    const ok = await confirm({
      title: `Delete this ${config.label.toLowerCase()}?`,
      message: "This cannot be undone.",
      tone: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteEntityAction(entity, row.id);
    });
  }

  return (
    <FormProvider {...form}>
      <RelationOptionsProvider options={relationOptions}>
        <FormCard
          title={row ? `Edit ${config.label.toLowerCase()}` : `New ${config.label.toLowerCase()}`}
          backHref={`/admin/${entity}`}
          backLabel={config.pluralLabel}
          onDelete={row && canDelete ? onDelete : undefined}
          maxWidth="max-w-2xl"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          {config.fields.map((field) => (
            <FieldRenderer key={field.key} spec={field} name={field.key} />
          ))}

          <AsyncMessage message={error ? { kind: "error", text: error } : null} />

          <SubmitButton pending={isPending} />
        </FormCard>
        {dialog}
      </RelationOptionsProvider>
    </FormProvider>
  );
}
