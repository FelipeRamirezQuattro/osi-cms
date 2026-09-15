"use server";

import { processFormSubmission } from "@/lib/actions/form-submission-pipeline";
import { sendContactNotification } from "@/lib/email";
import { contactFormSchema } from "@/lib/validation/forms";

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

  const { pageSlug, website, ...payload } = parsed.data;

  return processFormSubmission({
    formKey: "contact",
    pageSlug,
    payload,
    // Honeypot tripped — real users never fill this field.
    honeypotTripped: Boolean(website),
    notify: () => sendContactNotification({ ...payload, pageSlug }),
  });
}
