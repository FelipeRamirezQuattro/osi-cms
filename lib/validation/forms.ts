import { z } from "zod";

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
