/**
 * What a public signup should do, given the row (if any) already stored for
 * that email. Pure so every branch is unit-testable; the I/O lives in
 * lib/data/newsletter-subscribers.ts and lib/actions/subscribe-newsletter.ts.
 *
 * The visitor sees the same confirmation message for every outcome, so the
 * form can't be used to discover who is already on the list.
 */
export const CONFIRMATION_COOLDOWN_MINUTES = 10;

export type ExistingSubscriber = {
  // A plain string, as the generated DB types give it (a check constraint
  // limits it to pending|subscribed|unsubscribed). Only "subscribed" is
  // special-cased; anything else restarts double opt-in.
  status: string;
  confirmation_sent_at: string | null;
};

export type SignupDecision =
  /** No row yet — create one and send a confirmation. */
  | "create"
  /** Pending, or previously unsubscribed: (re)start double opt-in and send a confirmation. */
  | "send_confirmation"
  /** Already confirmed — send nothing. */
  | "already_subscribed"
  /** A confirmation went out very recently — don't let repeat submits mail-bomb an address. */
  | "cooldown";

export function decideSignup(existing: ExistingSubscriber | null, now: Date = new Date()): SignupDecision {
  if (!existing) return "create";
  if (existing.status === "subscribed") return "already_subscribed";
  if (existing.confirmation_sent_at) {
    const elapsedMs = now.getTime() - new Date(existing.confirmation_sent_at).getTime();
    if (elapsedMs < CONFIRMATION_COOLDOWN_MINUTES * 60_000) return "cooldown";
  }
  return "send_confirmation";
}
