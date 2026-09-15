"use client";

import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { Section } from "@/components/ui/section";
import { submitFormAction, type FormBlockState } from "@/lib/actions/submit-form";
import { formFieldDefinitionSchema, type FormFieldDefinition } from "@/lib/validation/forms";
import type { FormBlockData } from "@/components/blocks/form";
import type { Tables } from "@/lib/db/database.types";

const fieldClass =
  "w-full rounded-full border border-current bg-transparent px-5 py-3 text-sm placeholder:opacity-60 focus:outline-2 focus:outline-offset-2 focus:outline-osi-gold-500";
const textareaClass =
  "w-full rounded-2xl border border-current bg-transparent px-5 py-3 text-sm placeholder:opacity-60 focus:outline-2 focus:outline-offset-2 focus:outline-osi-gold-500";

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
  definition: Tables<"form_definitions">;
}) {
  const pathname = usePathname();
  const fields = parseFieldDefinitions(definition.fields);
  const action = submitFormAction.bind(null, data.formKey);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      reveal={false}
    >
      {data.title && <h2 className="mb-8 font-display-soft text-section font-semibold">{data.title}</h2>}
      {state.status === "success" ? (
        <p className="text-sm">{definition.success_message}</p>
      ) : (
        <form action={formAction} className="space-y-4">
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
            <FormFieldInput key={field.key} field={field} pathname={pathname} />
          ))}
          {state.status === "error" && <p className="text-sm text-red-400">{state.message}</p>}
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-osi-gold-500 px-8 py-3 font-display text-sm tracking-wide-display text-osi-navy-900 uppercase transition-colors hover:bg-osi-gold-400 disabled:opacity-60"
          >
            {pending ? "Sending…" : definition.submit_label}
          </button>
        </form>
      )}
    </Section>
  );
}

function FormFieldInput({ field, pathname }: { field: FormFieldDefinition; pathname: string }) {
  switch (field.type) {
    case "hidden-page-context":
      return <input type="hidden" name={field.key} value={pathname.replace(/^\/+/, "")} />;
    case "textarea":
      return (
        <textarea
          name={field.key}
          placeholder={field.placeholder || field.label}
          required={field.required}
          rows={5}
          className={textareaClass}
        />
      );
    case "select":
      return (
        <select name={field.key} required={field.required} defaultValue="" className={fieldClass}>
          <option value="" disabled>
            {field.placeholder || field.label}
          </option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
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
        <input
          type="email"
          name={field.key}
          placeholder={field.placeholder || field.label}
          required={field.required}
          className={fieldClass}
        />
      );
    case "tel":
      return (
        <input
          type="tel"
          name={field.key}
          placeholder={field.placeholder || field.label}
          required={field.required}
          className={fieldClass}
        />
      );
    case "text":
    default:
      return (
        <input
          type="text"
          name={field.key}
          placeholder={field.placeholder || field.label}
          required={field.required}
          className={fieldClass}
        />
      );
  }
}
