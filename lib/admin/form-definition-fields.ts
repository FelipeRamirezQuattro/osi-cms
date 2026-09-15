import type { FieldSpec } from "@/lib/blocks/admin-fields";
import { FORM_FIELD_TYPES } from "@/lib/validation/forms";

/**
 * Form definitions get a bespoke editor (app/admin/(dashboard)/forms/),
 * same reasoning as products — they have real internal structure (a
 * repeatable `fields` array) the generic simple-entity admin
 * (lib/admin/entity-config.ts) doesn't model well as a one-row form.
 * Reuses the same FieldRenderer engine though: `array`+`itemFields` for
 * the field list, `array` (no itemFields — plain strings) for one
 * select field's options.
 */
export const FORM_DEFINITION_FIELDS: FieldSpec[] = [
  { key: "name", label: "Name", type: "text" },
  { key: "form_key", label: "Form key (used by the \"form\" block)", type: "text" },
  { key: "status", label: "Status", type: "select", options: ["draft", "published"] },
  { key: "submit_label", label: "Submit button label", type: "text" },
  { key: "success_message", label: "Success message", type: "textarea" },
  {
    key: "notification_email",
    label: "Notification email (optional — leave blank to skip email notifications)",
    type: "text",
    optional: true,
  },
  {
    key: "fields",
    label: "Fields",
    type: "array",
    minItems: 1,
    itemFields: [
      { key: "key", label: "Field key (used as the submission's payload key)", type: "text" },
      { key: "label", label: "Label", type: "text" },
      { key: "type", label: "Type", type: "select", options: [...FORM_FIELD_TYPES] },
      { key: "required", label: "Required", type: "boolean" },
      { key: "placeholder", label: "Placeholder", type: "text", optional: true },
      { key: "options", label: "Options (select fields only, one per row)", type: "array" },
    ],
  },
];

export const FORM_DEFINITION_DEFAULTS = {
  name: "",
  form_key: "",
  status: "draft" as const,
  submit_label: "Submit",
  success_message: "Thanks — we'll be in touch shortly.",
  notification_email: "",
  fields: [] as unknown[],
};
