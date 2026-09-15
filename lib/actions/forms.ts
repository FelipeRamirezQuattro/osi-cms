"use server";

import { redirect } from "next/navigation";
import { requireCapability, requirePublishCapabilityForStatusChange } from "@/lib/auth";
import {
  createFormDefinition,
  deleteFormDefinition,
  getFormDefinitionById,
  listFormDefinitions,
  updateFormDefinition,
  type FormDefinitionInputRow,
} from "@/lib/data/forms";
import type { Json, Tables } from "@/lib/db/database.types";
import { formatZodError, isUniqueViolationError } from "@/lib/validation/common";
import { formDefinitionSchema } from "@/lib/validation/forms";

export async function listFormDefinitionsAction(): Promise<Tables<"form_definitions">[]> {
  await requireCapability("edit_drafts");
  return listFormDefinitions();
}

export async function getFormDefinitionAction(id: string): Promise<Tables<"form_definitions"> | null> {
  await requireCapability("edit_drafts");
  return getFormDefinitionById(id);
}

export type SaveFormDefinitionResult =
  | { status: "success"; id: string }
  | { status: "error"; message: string; field?: string };

export async function saveFormDefinitionAction(
  id: string | null,
  values: unknown,
): Promise<SaveFormDefinitionResult> {
  await requireCapability("edit_drafts");

  const parsed = formDefinitionSchema.safeParse(values);
  if (!parsed.success) {
    const { message, field } = formatZodError(parsed.error);
    return { status: "error", message, field };
  }

  // Same reasoning as saveProductAction/saveEntityAction: edit_drafts
  // covers ordinary create/edit, but flipping `status` to/from
  // "published" needs the publish capability too. Read the row's
  // pre-save status (or null for a brand-new definition) and guard
  // *before* the try/catch below — requirePublishCapabilityForStatusChange
  // redirects internally, and catching that here would misreport a
  // rejected publish attempt as a generic save failure.
  const current = id ? await getFormDefinitionById(id) : null;
  await requirePublishCapabilityForStatusChange(current?.status ?? null, parsed.data.status);

  const payload: FormDefinitionInputRow = {
    name: parsed.data.name,
    form_key: parsed.data.form_key,
    status: parsed.data.status,
    submit_label: parsed.data.submit_label,
    success_message: parsed.data.success_message,
    notification_email: parsed.data.notification_email,
    fields: parsed.data.fields as unknown as Json,
  };

  try {
    if (id) {
      const row = await updateFormDefinition(id, payload);
      return { status: "success", id: row.id };
    }
    const row = await createFormDefinition(payload);
    return { status: "success", id: row.id };
  } catch (error) {
    if (isUniqueViolationError(error)) {
      return { status: "error", message: "That form key is already in use — choose a different one.", field: "form_key" };
    }
    return { status: "error", message: "Save failed. Please try again." };
  }
}

export async function deleteFormDefinitionAction(id: string): Promise<void> {
  await requireCapability("delete_content");
  await deleteFormDefinition(id);
  redirect("/admin/forms");
}
