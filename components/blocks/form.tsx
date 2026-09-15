import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { getPublishedFormDefinitionByKey } from "@/lib/data/forms";
import { FormBlockClient } from "@/components/blocks/form-client";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

// Schema/registration must NOT carry "use client" — the registry reads
// `.schema` server-side, and non-component exports from a client module
// come through as unusable references there (see CLAUDE.md's block
// registry "critical gotcha"). FormBlockRender below stays a plain async
// Server Component in this same file (it only fetches, it isn't
// interactive) and delegates the actual <form> to FormBlockClient in
// form-client.tsx — same split as contact-form.tsx/contact-form-client.tsx,
// with an extra server-side data-fetch step this block needs and
// contact_form (a fixed, hardcoded shape) doesn't.
const schema = blockCommonSchema.extend({
  title: z.string().optional(),
  formKey: z.string().trim().min(1, "Form key is required"),
});

export type FormBlockData = z.infer<typeof schema>;

const adminFields: FieldSpec[] = [
  { key: "title", label: "Title", type: "text", optional: true },
  {
    key: "formKey",
    label: "Form key (matches a form built in Admin → Forms)",
    type: "text",
  },
];

function DevDiagnostic({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") return null;
  return <div className="bg-red-600 p-4 font-mono text-sm text-white">{children}</div>;
}

export async function FormBlockRender({ data }: { data: FormBlockData }) {
  const definition = await getPublishedFormDefinitionByKey(data.formKey);
  if (!definition) {
    return <DevDiagnostic>Form &quot;{data.formKey}&quot; not found or not published.</DevDiagnostic>;
  }
  // Pick only what the client actually renders — `notification_email` (and
  // any other admin-only column) never needs to reach the browser's RSC
  // flight payload. Full-row access stays server-only, in
  // lib/actions/submit-form.ts, where the notification email is sent.
  return (
    <FormBlockClient
      data={data}
      definition={{
        fields: definition.fields,
        submit_label: definition.submit_label,
        success_message: definition.success_message,
      }}
    />
  );
}

export const formBlock = defineBlock({
  type: "form",
  label: "Form",
  category: "forms",
  description:
    "Renders a published form built in Admin → Forms, by its form key — the generic, admin-configurable form engine (any field set, no code). Use contact_form instead for the site's dedicated contact form.",
  schema,
  adminFields,
  defaults: { background: "navy", spacingTop: "md", spacingBottom: "md", formKey: "" },
  Render: FormBlockRender,
});
