import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { NewsletterSignupRender } from "@/components/blocks/newsletter-signup-client";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

// Schema/registration must NOT carry "use client" — see contact-form.tsx.
// The form itself (and its useActionState hook) lives in
// newsletter-signup-client.tsx.
const schema = blockCommonSchema.extend({
  title: z.string().default("Stay up to date"),
  description: z.string().default("Get Odessa Separator news and product updates by email."),
  submitLabel: z.string().default("Subscribe"),
});

export type NewsletterSignupData = z.infer<typeof schema>;

const adminFields: FieldSpec[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "description", label: "Short description", type: "textarea", optional: true },
  { key: "submitLabel", label: "Button label", type: "text" },
];

export const newsletterSignupBlock = defineBlock({
  type: "newsletter_signup",
  label: "Newsletter signup",
  category: "forms",
  description:
    "Email signup with double opt-in confirmation, honeypot and rate limiting — subscribers appear in Admin → Newsletter. Needs the newsletter email settings configured to complete signups.",
  schema,
  adminFields,
  defaults: {
    background: "cream",
    spacingTop: "md",
    spacingBottom: "md",
    title: "Stay up to date",
    description: "Get Odessa Separator news and product updates by email.",
    submitLabel: "Subscribe",
  },
  Render: NewsletterSignupRender,
});
