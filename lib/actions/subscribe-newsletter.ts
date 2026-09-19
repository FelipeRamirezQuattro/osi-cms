"use server";

import { hashClientIp } from "@/lib/actions/form-submission-pipeline";
import {
  countRecentSignupsByIp,
  createPendingSubscriber,
  findSubscriberByEmail,
  markConfirmationSent,
  restartPendingSubscriber,
} from "@/lib/data/newsletter-subscribers";
import { sendNewsletterConfirmation } from "@/lib/email";
import { decideSignup } from "@/lib/newsletter/signup";
import { createSubscriberToken, isTokenSecretConfigured } from "@/lib/newsletter/tokens";
import { absoluteUrl } from "@/lib/seo";
import { newsletterSignupSchema } from "@/lib/validation/newsletter";

export type NewsletterSignupState = { status: "idle" | "success" | "error"; message?: string };

// Per-IP brake on signups for many different addresses. The per-address
// mail-bombing brake is the confirmation cooldown in lib/newsletter/signup.ts.
const SIGNUP_RATE_LIMIT_MAX = 5;
const SIGNUP_RATE_LIMIT_WINDOW_MINUTES = 10;

/**
 * Public newsletter signup: honeypot -> validate -> rate limit -> store as
 * `pending` -> confirmation email. The visitor gets the same success
 * message whether the address is new, already pending, or already
 * subscribed, so the form can't be used to probe the list.
 */
export async function subscribeToNewsletter(
  _prevState: NewsletterSignupState,
  formData: FormData,
): Promise<NewsletterSignupState> {
  const parsed = newsletterSignupSchema.safeParse({
    email: formData.get("email"),
    pageSlug: formData.get("pageSlug") || undefined,
    website: formData.get("website") || undefined,
  });
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const { email, pageSlug, website } = parsed.data;
  const success: NewsletterSignupState = {
    status: "success",
    message: "Almost there — check your inbox and confirm your email address to finish subscribing.",
  };

  // Real users never fill the hidden field.
  if (website) return success;

  // Fail closed: without the signing secret we could store a row but never
  // send a link that verifies, leaving someone stuck "pending" forever.
  if (!isTokenSecretConfigured()) {
    console.error("[newsletter] NEWSLETTER_TOKEN_SECRET is not set — signup is disabled.");
    return { status: "error", message: "Signup is temporarily unavailable. Please try again later." };
  }

  try {
    const ipHash = await hashClientIp();
    const recent = await countRecentSignupsByIp(ipHash, SIGNUP_RATE_LIMIT_WINDOW_MINUTES);
    if (recent >= SIGNUP_RATE_LIMIT_MAX) {
      return { status: "error", message: "Too many attempts — please try again in a few minutes." };
    }

    const existing = await findSubscriberByEmail(email);
    const decision = decideSignup(existing);
    if (decision === "already_subscribed" || decision === "cooldown") return success;

    const context = { ipHash, pageSlug: pageSlug ?? null };
    const subscriber =
      decision === "create" || !existing
        ? await createPendingSubscriber({ email, ...context })
        : await restartPendingSubscriber(existing.id, context);

    const token = createSubscriberToken("confirm", subscriber.id);
    if (token) {
      const sent = await sendNewsletterConfirmation({
        to: email,
        confirmUrl: absoluteUrl(`/newsletter/confirm?token=${encodeURIComponent(token)}`),
      });
      if (sent) await markConfirmationSent(subscriber.id);
    }
  } catch (err) {
    console.error("[newsletter] Signup failed:", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  return success;
}
