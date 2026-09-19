"use client";

import { useActionState } from "react";
import { StatusMessage } from "@/components/ui/public-primitives";
import { PUBLIC_SUBMIT_CLASS } from "@/components/ui/public-form-styles";
import {
  confirmNewsletterSubscription,
  unsubscribeFromNewsletter,
  type NewsletterTokenActionState,
} from "@/lib/actions/newsletter-subscription";

const initialState: NewsletterTokenActionState = { status: "idle" };

const COPY = {
  confirm: { action: confirmNewsletterSubscription, button: "Confirm subscription", success: "You're subscribed" },
  unsubscribe: { action: unsubscribeFromNewsletter, button: "Unsubscribe", success: "You're unsubscribed" },
} as const;

/** A single button that performs the emailed link's action once pressed (never on page load). */
export function NewsletterTokenForm({ mode, token }: { mode: keyof typeof COPY; token: string }) {
  const copy = COPY[mode];
  const [state, formAction, pending] = useActionState(copy.action, initialState);

  if (state.status === "success") {
    return (
      <StatusMessage title={copy.success} tone="success">
        {state.message}
      </StatusMessage>
    );
  }

  return (
    <form action={formAction} aria-busy={pending} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.status === "error" && <StatusMessage tone="error">{state.message}</StatusMessage>}
      <button type="submit" disabled={pending} className={PUBLIC_SUBMIT_CLASS}>
        {pending ? "Working…" : copy.button}
      </button>
    </form>
  );
}
