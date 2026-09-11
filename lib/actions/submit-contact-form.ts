"use server";

import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { z } from "zod";
import { countRecentSubmissionsByIp, insertFormSubmission } from "@/lib/data/forms";
import { sendContactNotification } from "@/lib/email";

// Not persisted anywhere, not exposed to the client — just enough to
// rate-limit by IP without storing a raw IP address in the DB.
async function hashClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  return createHash("sha256")
    .update(`${ip}:${process.env.IP_HASH_SALT ?? ""}`)
    .digest("hex");
}

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MINUTES = 10;

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

  const { pageSlug, website: _website, ...payload } = parsed.data;
  void _website;

  const ipHash = await hashClientIp();
  const recentCount = await countRecentSubmissionsByIp(ipHash, RATE_LIMIT_WINDOW_MINUTES);
  if (recentCount >= RATE_LIMIT_MAX) {
    return { status: "error", message: "Too many submissions — please try again in a few minutes." };
  }

  const h = await headers();
  const { error } = await insertFormSubmission({
    form_key: "contact",
    page_slug: pageSlug,
    payload,
    ip_hash: ipHash,
    user_agent: h.get("user-agent"),
  });

  if (error) {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  await sendContactNotification({ ...payload, pageSlug });

  return { status: "success" };
}
