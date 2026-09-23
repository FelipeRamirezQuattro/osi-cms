import { z } from "zod";

/** Public newsletter signup (lib/actions/subscribe-newsletter.ts). */
export const newsletterSignupSchema = z.object({
  // Lowercased here because newsletter_subscribers.email is constrained to
  // lower(email) and uniquely indexed on it.
  email: z.string().trim().toLowerCase().max(254, "Enter a valid email address").email("Enter a valid email address"),
  pageSlug: z.string().optional(),
  // Honeypot — real users never fill it. Deliberately NOT max(0): a filled
  // honeypot must reach the action, which drops the signup and still
  // reports success, so a bot can't tell it was caught.
  website: z.string().optional(),
});

export type NewsletterSignupInput = z.infer<typeof newsletterSignupSchema>;

export const newsletterTagNameSchema = z.string().trim().min(1, "Tag name is required").max(60, "Tag names are at most 60 characters");

/** Admin "add subscriber" form — same normalization as public signup, reused so the two never drift. */
export const adminAddSubscriberEmailSchema = newsletterSignupSchema.shape.email;

/** Campaign draft fields. `blocks` is validated separately, block by block, against the email block registry. */
export const campaignInputSchema = z.object({
  name: z.string().trim().min(1, "Give the campaign a name").max(120, "Names are at most 120 characters"),
  subject: z.string().trim().max(200, "Subject lines are at most 200 characters"),
  preheader: z.string().trim().max(200, "Preview text is at most 200 characters"),
  tag_ids: z.array(z.string().uuid()).max(50),
  blocks: z.unknown(),
});

export type CampaignInput = z.infer<typeof campaignInputSchema>;
