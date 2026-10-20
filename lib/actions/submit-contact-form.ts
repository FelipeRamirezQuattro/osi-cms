"use server";

import { processFormSubmission } from "@/lib/actions/form-submission-pipeline";
import { sendContactConfirmation, sendContactNotification } from "@/lib/email";
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
    notify: async () => {
      // Independent best-effort sends: a failed staff notification must not
      // suppress the visitor's receipt, or the other way round.
      await Promise.all([
        sendContactNotification({ ...payload, pageSlug }),
        sendContactConfirmation({ ...payload, pageSlug }),
      ]);
    },
  });
}
