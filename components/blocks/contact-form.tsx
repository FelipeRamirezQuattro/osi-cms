import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { ContactFormRender } from "@/components/blocks/contact-form-client";

// Schema/registration must NOT carry "use client" — the registry reads
// `.schema` server-side, and non-component exports from a client module
// come through as unusable references there. The actual form (and its
// useActionState hook) lives in contact-form-client.tsx.
const schema = blockCommonSchema.extend({
  title: z.string().default("Leave us a message"),
  submitLabel: z.string().default("Submit message"),
});

export type ContactFormData = z.infer<typeof schema>;

export const contactFormBlock = defineBlock({
  type: "contact_form",
  label: "Contact form",
  category: "forms",
  schema,
  defaults: { background: "navy", spacingTop: "md", spacingBottom: "md", title: "Leave us a message", submitLabel: "Submit message" },
  Render: ContactFormRender,
});
