"use client";

import { useActionState } from "react";
import { usePathname } from "next/navigation";
import { Section } from "@/components/ui/section";
import { StatusMessage } from "@/components/ui/public-primitives";
import { PUBLIC_FIELD_CLASS, PUBLIC_LABEL_CLASS, PUBLIC_SUBMIT_CLASS } from "@/components/ui/public-form-styles";
import { subscribeToNewsletter, type NewsletterSignupState } from "@/lib/actions/subscribe-newsletter";
import type { NewsletterSignupData } from "@/components/blocks/newsletter-signup";

const initialState: NewsletterSignupState = { status: "idle" };

export function NewsletterSignupRender({ data }: { data: NewsletterSignupData }) {
  const [state, formAction, pending] = useActionState(subscribeToNewsletter, initialState);
  const pathname = usePathname();

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      reveal={false}
    >
      <div className="max-w-xl">
        <h2 className="font-editorial text-section font-semibold text-balance">{data.title}</h2>
        {data.description && <p className="mt-3 text-base leading-relaxed">{data.description}</p>}
        <div className="mt-6">
          {state.status === "success" ? (
            <StatusMessage title="Check your inbox" tone="success">
              {state.message}
            </StatusMessage>
          ) : (
            <form action={formAction} aria-busy={pending} className="space-y-4">
              {/* Honeypot — off-screen rather than display:none, same as the contact form. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="absolute -left-[9999px]"
                aria-hidden
              />
              <input type="hidden" name="pageSlug" value={pathname === "/" ? "home" : pathname.replace(/^\/+/, "")} />
              <label htmlFor="newsletter-email" className="block">
                <span className={PUBLIC_LABEL_CLASS}>Email address</span>
                <input
                  id="newsletter-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  spellCheck={false}
                  placeholder="Email Address"
                  required
                  className={PUBLIC_FIELD_CLASS}
                />
              </label>
              {state.status === "error" && (
                <StatusMessage title="We couldn’t sign you up" tone="error">
                  {state.message ?? "Something went wrong. Please try again."}
                </StatusMessage>
              )}
              <button type="submit" disabled={pending} className={PUBLIC_SUBMIT_CLASS}>
                {pending ? "Subscribing…" : data.submitLabel}
              </button>
              <p className="text-xs opacity-70">
                We&rsquo;ll email you a link to confirm. You can unsubscribe at any time.
              </p>
            </form>
          )}
        </div>
      </div>
    </Section>
  );
}
