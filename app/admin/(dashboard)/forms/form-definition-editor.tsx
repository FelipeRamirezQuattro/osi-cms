"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FormProvider, useForm } from "react-hook-form";
import { FieldRenderer } from "@/components/admin/field-renderer";
import { deleteFormDefinitionAction, saveFormDefinitionAction } from "@/lib/actions/forms";
import { FORM_DEFINITION_DEFAULTS, FORM_DEFINITION_FIELDS } from "@/lib/admin/form-definition-fields";
import { hasCapability } from "@/lib/auth/capabilities";
import type { AdminRole } from "@/lib/auth";
import type { Tables } from "@/lib/db/database.types";
import { FormCard, SubmitButton } from "@/components/admin/ui/form-card";
import { AsyncMessage } from "@/components/admin/ui/async-message";
import { useConfirmDialog } from "@/components/admin/ui/confirm-dialog";

// Same reasoning as page-editor.tsx / product-editor.tsx: the form's
// `fields` array shape is described at runtime by FieldSpec, not a
// static TS type.
/* eslint-disable @typescript-eslint/no-explicit-any */

export function FormDefinitionEditor({
  definition,
  role = "editor",
}: {
  definition: Tables<"form_definitions"> | null;
  role?: AdminRole;
}) {
  const canDelete = hasCapability(role, "delete_content");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  const form = useForm<any>({
    defaultValues: definition
      ? { ...definition, notification_email: definition.notification_email ?? "" }
      : FORM_DEFINITION_DEFAULTS,
  });

  function onSubmit(values: any) {
    setError(null);
    startTransition(async () => {
      const result = await saveFormDefinitionAction(definition?.id ?? null, values);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      router.push("/admin/forms");
      router.refresh();
    });
  }

  async function onDelete() {
    if (!definition) return;
    const ok = await confirm({
      title: `Delete "${definition.name}"?`,
      message: "This cannot be undone.",
      tone: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      await deleteFormDefinitionAction(definition.id);
    });
  }

  return (
    <FormProvider {...form}>
      <FormCard
        title={definition ? `Edit ${definition.name}` : "New form"}
        backHref="/admin/forms"
        backLabel="Forms"
        onDelete={definition && canDelete ? onDelete : undefined}
        onSubmit={form.handleSubmit(onSubmit)}
      >
        {FORM_DEFINITION_FIELDS.map((field) => (
          <FieldRenderer key={field.key} spec={field} name={field.key} />
        ))}

        <AsyncMessage message={error ? { kind: "error", text: error } : null} />

        <SubmitButton pending={isPending} />
      </FormCard>
      {dialog}
    </FormProvider>
  );
}
