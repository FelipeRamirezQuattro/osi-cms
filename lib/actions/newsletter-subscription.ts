"use server";

import { confirmSubscriber, unsubscribeSubscriber } from "@/lib/data/newsletter-subscribers";
import { verifySubscriberToken } from "@/lib/newsletter/tokens";

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
