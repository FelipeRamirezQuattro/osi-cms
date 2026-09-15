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

  function onDelete() {
    if (!definition) return;
    if (!window.confirm(`Delete "${definition.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteFormDefinitionAction(definition.id);
    });
  }

  return (
    <FormProvider {...form}>
      <div className="max-w-3xl space-y-6 pb-16">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-lg tracking-wide-display uppercase">
            {definition ? `Edit ${definition.name}` : "New form"}
          </h1>
          {definition && canDelete && (
            <button type="button" onClick={onDelete} className="text-xs text-red-600 hover:underline">
              Delete
            </button>
          )}
        </div>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-4 rounded border border-osi-sand-300 bg-osi-white p-5"
        >
          {FORM_DEFINITION_FIELDS.map((field) => (
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
    </FormProvider>
  );
}
