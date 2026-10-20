"use server";

import { confirmSubscriber, getSubscriberEmail, unsubscribeSubscriber } from "@/lib/data/newsletter-subscribers";
import { sendNewsletterWelcome } from "@/lib/email";
import { createSubscriberToken, verifySubscriberToken } from "@/lib/newsletter/tokens";
import { absoluteUrl } from "@/lib/seo";

export type NewsletterTokenActionState = { status: "idle" | "success" | "error"; message?: string };

const INVALID_LINK: NewsletterTokenActionState = {
  status: "error",
  message: "This link is invalid or has expired.",
};

// Both actions re-verify the signed token themselves — the hidden form field
// is attacker-controlled, so the page having verified it once proves nothing.
// They run from a button press (not the emailed GET) because mail scanners
// prefetch links, and a state change on GET would confirm or unsubscribe
// people automatically.

export async function confirmNewsletterSubscription(
  _prev: NewsletterTokenActionState,
  formData: FormData,
): Promise<NewsletterTokenActionState> {
  const id = verifySubscriberToken("confirm", formData.get("token")?.toString());
  if (!id) return INVALID_LINK;

  try {
    const result = await confirmSubscriber(id);
    if (result === "not_pending") {
      return {
        status: "error",
        message: "This subscription can no longer be confirmed. Please sign up again from the website.",
      };
    }
    if (result === "confirmed") await sendWelcomeBestEffort(id);
    return { status: "success", message: "You're subscribed. Thanks for confirming your email address." };
  } catch (err) {
    console.error("[newsletter] Confirm failed:", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}

export async function unsubscribeFromNewsletter(
  _prev: NewsletterTokenActionState,
  formData: FormData,
): Promise<NewsletterTokenActionState> {
  const id = verifySubscriberToken("unsubscribe", formData.get("token")?.toString());
  if (!id) return INVALID_LINK;

  try {
    await unsubscribeSubscriber(id);
    // Reported as success even if the row is already gone — the goal (not
    // receiving mail) is met either way.
    return { status: "success", message: "You've been unsubscribed and won't receive further newsletters." };
  } catch (err) {
    console.error("[newsletter] Unsubscribe failed:", err);
    return { status: "error", message: "Something went wrong. Please try again." };
  }
}

/** The welcome mail is a courtesy: the subscription is already confirmed, so a mail problem never fails the action. */
async function sendWelcomeBestEffort(subscriberId: string): Promise<void> {
  try {
    const [email, token] = [await getSubscriberEmail(subscriberId), createSubscriberToken("unsubscribe", subscriberId)];
    if (!email || !token) return;
    const query = `?token=${encodeURIComponent(token)}`;
    await sendNewsletterWelcome({
      to: email,
      unsubscribeUrl: absoluteUrl(`/newsletter/unsubscribe${query}`),
      oneClickUnsubscribeUrl: absoluteUrl(`/api/newsletter/unsubscribe${query}`),
    });
  } catch (err) {
    console.error("[newsletter] Welcome email failed:", err);
  }
}
