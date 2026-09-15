"use server";

import { processFormSubmission, type FormSubmissionResult } from "@/lib/actions/form-submission-pipeline";
import { getPublishedFormDefinitionByKey } from "@/lib/data/forms";
import { sendFormNotification } from "@/lib/email";
import { buildDynamicFormSchema, formFieldDefinitionSchema, type FormFieldDefinition } from "@/lib/validation/forms";

/**
 * Public submission handler for the generic `form` block
 * (components/blocks/form.tsx) — the Task 10 counterpart of
 * submitContactForm, built for any admin-configured form_definitions row
 * instead of one hardcoded shape. Bound to a specific form's key via
 * `.bind(null, formKey)` before being handed to useActionState (see
 * components/blocks/form-client.tsx), the same way a Server Action
 * captures any other leading argument.
 */
export type FormBlockState = FormSubmissionResult;

const FORM_NOT_AVAILABLE: FormBlockState = { status: "error", message: "This form is not available right now." };
const FORM_INVALID_INPUT: FormBlockState = { status: "error", message: "Please check the form and try again." };

export async function submitFormAction(
  formKey: string,
  _prevState: FormBlockState,
  formData: FormData,
): Promise<FormBlockState> {
  const definition = await getPublishedFormDefinitionByKey(formKey);
  if (!definition) return FORM_NOT_AVAILABLE;

  const fields = parseFieldDefinitions(definition.fields);
  const schema = buildDynamicFormSchema(fields);

  const raw: Record<string, unknown> = { website: formData.get("website") || undefined };
  for (const field of fields) {
    raw[field.key] = formData.get(field.key) ?? undefined;
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) return FORM_INVALID_INPUT;

  const values = { ...(parsed.data as Record<string, unknown>) };
  const honeypotTripped = Boolean(values.website);
  delete values.website;

  // A hidden-page-context field's value maps to form_submissions'
  // dedicated page_slug column (same as contactFormSchema's pageSlug)
  // rather than sitting duplicated inside the jsonb payload too.
  const pageContextField = fields.find((field) => field.type === "hidden-page-context");
  const pageSlug = pageContextField ? normalizeSlug(values[pageContextField.key]) : undefined;
  if (pageContextField) delete values[pageContextField.key];

  return processFormSubmission({
    formKey,
    pageSlug,
    payload: values,
    honeypotTripped,
    notify: () =>
      sendFormNotification({ formName: definition.name, to: definition.notification_email, payload: values }),
  });
}

function normalizeSlug(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.replace(/^\/+/, "").trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Defensive re-validation of the stored `fields` jsonb at submission time
 * — the admin editor already validates via formDefinitionSchema before
 * saving, but a submission handler should never trust stored jsonb blindly.
 * A malformed entry is dropped rather than failing the whole form.
 */
function parseFieldDefinitions(raw: unknown): FormFieldDefinition[] {
  if (!Array.isArray(raw)) return [];
  const result: FormFieldDefinition[] = [];
  for (const item of raw) {
    const parsed = formFieldDefinitionSchema.safeParse(item);
    if (parsed.success) result.push(parsed.data);
  }
  return result;
}
