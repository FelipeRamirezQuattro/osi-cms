"use server";

import { z } from "zod";
import { insertFormSubmission } from "@/lib/data/forms";

const contactFormSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  company: z.string().optional(),
  phone: z.string().min(1),
  companyNumber: z.string().optional(),
  message: z.string().min(1),
  pageSlug: z.string().optional(),
  // Honeypot: real users never fill this (it's visually hidden). Bots
  // that fill every field trip it.
  website: z.string().max(0).optional(),
});

export type ContactFormState = { status: "idle" | "success" | "error"; message?: string };

export async function submitContactForm(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const parsed = contactFormSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    company: formData.get("company") || undefined,
    phone: formData.get("phone"),
    companyNumber: formData.get("companyNumber") || undefined,
    message: formData.get("message"),
    pageSlug: formData.get("pageSlug") || undefined,
    website: formData.get("website") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: "Please check the form and try again." };
  }

  // Honeypot tripped — pretend success, drop the submission.
  if (parsed.data.website) {
    return { status: "success" };
  }

  const { pageSlug, ...payload } = parsed.data;

  // TODO(Phase 6): rate limiting and the Resend notification email land
  // here, per the master prompt's "Forms, search, SEO" phase.
  const { error } = await insertFormSubmission({
    form_key: "contact",
    page_slug: pageSlug,
    payload,
  });

  if (error) {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  return { status: "success" };
}
