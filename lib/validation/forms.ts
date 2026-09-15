import { z } from "zod";
import { emptyStringToNull, optionalEmailSchema, requiredString } from "@/lib/validation/common";

/**
 * Schema for the public contact form (lib/actions/submit-contact-form.ts).
 * Relocated verbatim from that file per the Task 6 controller ruling:
 * this is the existing public contact form's schema, not a stand-in for a
 * not-yet-built generic form-builder engine (that's a future task) — so
 * this file holds exactly one schema today, not a per-form-key registry.
 * Behavior is unchanged from the inline version: same fields, same
 * required/optional split, same honeypot field.
 */
export const contactFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  company: z.string().trim().optional(),
  phone: z.string().trim().min(1, "Phone is required"),
  companyNumber: z.string().trim().optional(),
  message: z.string().trim().min(1, "Message is required"),
  pageSlug: z.string().optional(),
  // Honeypot: real users never fill this (it's visually hidden). Bots
  // that fill every field trip it.
  website: z.string().max(0).optional(),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

/**
 * Task 10: the generic, admin-configurable form engine. `contact_form`
 * (above) is kept as its own hardcoded block/schema per the Task 10
 * controller ruling #6 ("contact_form stays a working compatibility
 * preset... your call") — this section is the new, separate engine any
 * *other* form uses, driven entirely by a `form_definitions` row instead
 * of a per-form TypeScript schema.
 */
export const FORM_FIELD_TYPES = [
  "text",
  "email",
  "tel",
  "textarea",
  "select",
  "checkbox-consent",
  "hidden-page-context",
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

// A stable per-field key — becomes the `form_submissions.payload` key and
// (for text/select inputs) the form control's `name` attribute, so it's
// constrained to a safe identifier rather than an arbitrary label.
const formFieldKeySchema = z
  .string()
  .trim()
  .min(1, "Field key is required")
  .regex(/^[a-z][a-z0-9_]*$/, "Field key must start with a letter and contain only lowercase letters, numbers, and underscores");

export const formFieldDefinitionSchema = z
  .object({
    key: formFieldKeySchema,
    label: requiredString("Field label"),
    type: z.enum(FORM_FIELD_TYPES),
    required: z.boolean().default(false),
    placeholder: z.string().trim().optional().default(""),
    // Only meaningful (and required to be non-empty) for type "select" —
    // enforced below rather than with a discriminated union, so the admin
    // editor's flat FieldSpec-driven array form (one shape for every
    // field type) doesn't need a conditional schema per row.
    options: z.array(z.string().trim().min(1)).optional().default([]),
  })
  .superRefine((field, ctx) => {
    if (field.type === "select" && field.options.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["options"],
        message: `"${field.label || field.key}" is a select field and needs at least one option`,
      });
    }
  });

export type FormFieldDefinition = z.infer<typeof formFieldDefinitionSchema>;

export const FORM_DEFINITION_STATUSES = ["draft", "published"] as const;

export const formDefinitionSchema = z
  .object({
    name: requiredString("Name"),
    form_key: z
      .string()
      .trim()
      .min(1, "Form key is required")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Form key must be lowercase letters, numbers, and hyphens"),
    status: z.enum(FORM_DEFINITION_STATUSES).default("draft"),
    submit_label: requiredString("Submit button label").default("Submit"),
    success_message: requiredString("Success message").default("Thanks — we'll be in touch shortly."),
    notification_email: optionalEmailSchema("Notification email"),
    fields: z.array(formFieldDefinitionSchema).default([]),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();
    value.fields.forEach((field, index) => {
      if (seen.has(field.key)) {
        ctx.addIssue({
          code: "custom",
          path: ["fields", index, "key"],
          message: `Field key "${field.key}" is used more than once — every field needs a unique key`,
        });
      }
      seen.add(field.key);
    });
  });

export type FormDefinitionInput = z.infer<typeof formDefinitionSchema>;

/**
 * The honeypot field every generic-engine form submission carries,
 * alongside whatever fields the form's own definition declares — same
 * convention as contactFormSchema's `website` field above.
 */
const HONEYPOT_KEY = "website";

/**
 * Builds the server-side Zod schema for one form_definitions row's
 * fields, dynamically, at submission time (lib/actions/submit-form.ts) —
 * this is the one piece contactFormSchema doesn't need, since a hardcoded
 * form's shape is already known at compile time. `hidden-page-context`
 * fields are always optional strings (the client fills them in from the
 * current pathname; nothing meaningful to require server-side beyond
 * "if present, must be a string").
 */
export function buildDynamicFormSchema(fields: FormFieldDefinition[]): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {
    [HONEYPOT_KEY]: z.string().max(0).optional(),
  };

  for (const field of fields) {
    switch (field.type) {
      case "email": {
        shape[field.key] = field.required
          ? z.string().trim().min(1, `${field.label} is required`).email(`${field.label} must be a valid email address`)
          : z.preprocess(
              emptyStringToNull,
              z.string().trim().email(`${field.label} must be a valid email address`).nullable().default(null),
            );
        break;
      }
      case "checkbox-consent": {
        // Checkbox inputs post "on" (checked) or are entirely absent from
        // FormData (unchecked) — never "false" — so normalize both to a
        // real boolean before validating.
        const toBoolean = (value: unknown) => value === "on" || value === "true" || value === true;
        shape[field.key] = z.preprocess(
          toBoolean,
          z.boolean().refine((value) => !field.required || value === true, {
            message: `${field.label} is required`,
          }),
        );
        break;
      }
      case "select": {
        const options = field.options;
        const inOptions = (value: string) => options.includes(value);
        shape[field.key] = field.required
          ? z
              .string()
              .trim()
              .min(1, `${field.label} is required`)
              .refine(inOptions, { message: `${field.label} must be one of the offered options` })
          : z.preprocess(
              emptyStringToNull,
              z
                .string()
                .refine(inOptions, { message: `${field.label} must be one of the offered options` })
                .nullable()
                .default(null),
            );
        break;
      }
      case "hidden-page-context": {
        shape[field.key] = z.preprocess(emptyStringToNull, z.string().nullable().default(null));
        break;
      }
      case "tel":
      case "textarea":
      case "text":
      default: {
        shape[field.key] = field.required
          ? z.string().trim().min(1, `${field.label} is required`)
          : z.preprocess(emptyStringToNull, z.string().nullable().default(null));
        break;
      }
    }
  }

  return z.object(shape);
}
