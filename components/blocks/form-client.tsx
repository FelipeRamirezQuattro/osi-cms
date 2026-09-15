"use client";

import { useActionState, useId } from "react";
import { usePathname } from "next/navigation";
import { Section } from "@/components/ui/section";
import { StatusMessage } from "@/components/ui/public-primitives";
import {
  PUBLIC_FIELD_CLASS,
  PUBLIC_LABEL_CLASS,
  PUBLIC_SUBMIT_CLASS,
  PUBLIC_TEXTAREA_CLASS,
} from "@/components/ui/public-form-styles";
import { submitFormAction, type FormBlockState } from "@/lib/actions/submit-form";
import { formFieldDefinitionSchema, type FormFieldDefinition } from "@/lib/validation/forms";
import type { FormBlockData } from "@/components/blocks/form";
import type { Tables } from "@/lib/db/database.types";

/** The public-safe subset of a form_definitions row — no notification_email, form_key, id, or status. */
export type PublicFormDefinition = Pick<Tables<"form_definitions">, "fields" | "submit_label" | "success_message">;

const initialState: FormBlockState = { status: "idle" };

/** Defensive re-validation of the stored `fields` jsonb, same reasoning as lib/actions/submit-form.ts's copy. */
function parseFieldDefinitions(raw: unknown): FormFieldDefinition[] {
  if (!Array.isArray(raw)) return [];
  const result: FormFieldDefinition[] = [];
  for (const item of raw) {
    const parsed = formFieldDefinitionSchema.safeParse(item);
    if (parsed.success) result.push(parsed.data);
  }
  return result;
}

export function FormBlockClient({
  data,
  definition,
}: {
  data: FormBlockData;
  definition: PublicFormDefinition;
}) {
  const pathname = usePathname();
  const fields = parseFieldDefinitions(definition.fields);
  const action = submitFormAction.bind(null, data.formKey);
  const [state, formAction, pending] = useActionState(action, initialState);
  // Unique per rendered instance (two `form` blocks — or the same one
  // rendered twice via a shared section — must not emit duplicate ids).
  const idPrefix = useId();

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      reveal={false}
    >
      {data.title && <h2 className="mb-8 font-editorial text-section font-semibold text-balance">{data.title}</h2>}
      {state.status === "success" ? (
        <StatusMessage title="Submission received" tone="success">
          {definition.success_message}
        </StatusMessage>
      ) : (
        <form action={formAction} aria-busy={pending} className="max-w-3xl space-y-5">
          {/* Honeypot — hidden from real users via CSS, not display:none
              (some bots skip hidden fields, few skip off-screen ones). */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="absolute -left-[9999px]"
            aria-hidden
          />
          {fields.map((field) => (
            <FormFieldInput key={field.key} field={field} pathname={pathname} idPrefix={idPrefix} />
          ))}
          {state.status === "error" && (
            <StatusMessage title="We couldn’t submit the form" tone="error">
              {state.message ?? "Something went wrong. Please review the form and try again."}
            </StatusMessage>
          )}
          <button
            type="submit"
            disabled={pending}
            className={PUBLIC_SUBMIT_CLASS}
          >
            {pending ? "Sending…" : definition.submit_label}
          </button>
        </form>
      )}
    </Section>
  );
}

function FormFieldInput({
  field,
  pathname,
  idPrefix,
}: {
  field: FormFieldDefinition;
  pathname: string | null;
  idPrefix: string;
}) {
  const id = `${idPrefix}-${field.key}`;

  switch (field.type) {
    case "hidden-page-context":
      return <input type="hidden" name={field.key} value={(pathname ?? "").replace(/^\/+/, "")} />;
    case "textarea":
      return (
        <label htmlFor={id}>
          <span className={PUBLIC_LABEL_CLASS}>{field.label}</span>
          <textarea
            id={id}
            name={field.key}
            placeholder={field.placeholder || field.label}
            required={field.required}
            rows={5}
            className={PUBLIC_TEXTAREA_CLASS}
          />
        </label>
      );
    case "select":
      return (
        <label htmlFor={id}>
          <span className={PUBLIC_LABEL_CLASS}>{field.label}</span>
          <select id={id} name={field.key} required={field.required} defaultValue="" className={PUBLIC_FIELD_CLASS}>
            <option value="" disabled>
              {field.placeholder || field.label}
            </option>
            {field.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      );
    case "checkbox-consent":
      return (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name={field.key} required={field.required} className="mt-1 h-4 w-4" />
          <span>{field.label}</span>
        </label>
      );
    case "email":
      return (
        <label htmlFor={id}>
          <span className={PUBLIC_LABEL_CLASS}>{field.label}</span>
          <input
            id={id}
            type="email"
            name={field.key}
            inputMode="email"
            autoComplete="email"
            spellCheck={false}
            placeholder={field.placeholder || field.label}
            required={field.required}
            className={PUBLIC_FIELD_CLASS}
          />
        </label>
      );
    case "tel":
      return (
        <label htmlFor={id}>
          <span className={PUBLIC_LABEL_CLASS}>{field.label}</span>
          <input
            id={id}
            type="tel"
            name={field.key}
            inputMode="tel"
            autoComplete="tel"
            spellCheck={false}
            placeholder={field.placeholder || field.label}
            required={field.required}
            className={PUBLIC_FIELD_CLASS}
          />
        </label>
      );
    case "text":
    default:
      return (
        <label htmlFor={id}>
          <span className={PUBLIC_LABEL_CLASS}>{field.label}</span>
          <input
            id={id}
            type="text"
            name={field.key}
            placeholder={field.placeholder || field.label}
            required={field.required}
            className={PUBLIC_FIELD_CLASS}
          />
        </label>
      );
  }
}
