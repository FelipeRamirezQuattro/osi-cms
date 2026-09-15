"use client";

import { useActionState } from "react";
import { Section } from "@/components/ui/section";
import { AsyncMessage } from "@/components/admin/ui/async-message";
import { submitContactForm, type ContactFormState } from "@/lib/actions/submit-contact-form";
import type { ContactFormData } from "@/components/blocks/contact-form";

const fieldClass =
  "w-full rounded-full border border-current bg-transparent px-5 py-3 text-sm placeholder:opacity-60 focus:outline-2 focus:outline-offset-2 focus:outline-osi-gold-500";
// Visible label above each field — small/uppercase, matching the label
// treatment already used across the admin (LabeledField in
// field-renderer.tsx) and this site's other small-caption text (e.g. the
// search page's result-type tags) rather than inventing a new look.
const labelClass = "mb-1 block text-xs uppercase tracking-wide-label opacity-70";

const initialState: ContactFormState = { status: "idle" };

export function ContactFormRender({ data }: { data: ContactFormData }) {
  const [state, formAction, pending] = useActionState(submitContactForm, initialState);

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      reveal={false}
    >
      <h2 className="mb-8 font-display-soft text-section font-semibold">
        {data.title}
      </h2>
      {state.status === "success" ? (
        <p role="status" aria-live="polite" className="text-sm">
          Thanks for submitting! We&rsquo;ll be in touch shortly.
        </p>
      ) : (
        <form action={formAction} className="space-y-4">
          {/* Honeypot — hidden from real users via CSS, not display:none
              (some bots skip hidden fields, few skip off-screen ones). */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            className="absolute -left-[9999px]"
            aria-hidden
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label htmlFor="contact-first-name">
              <span className={labelClass}>First Name</span>
              <input
                id="contact-first-name"
                name="firstName"
                type="text"
                autoComplete="given-name"
                placeholder="First Name"
                required
                className={fieldClass}
              />
            </label>
            <label htmlFor="contact-last-name">
              <span className={labelClass}>Last Name</span>
              <input
                id="contact-last-name"
                name="lastName"
                type="text"
                autoComplete="family-name"
                placeholder="Last Name"
                required
                className={fieldClass}
              />
            </label>
            <label htmlFor="contact-email">
              <span className={labelClass}>Email Address</span>
              <input
                id="contact-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                spellCheck={false}
                placeholder="Email Address"
                required
                className={fieldClass}
              />
            </label>
            <label htmlFor="contact-company">
              <span className={labelClass}>Company Name (Optional)</span>
              <input
                id="contact-company"
                name="company"
                type="text"
                autoComplete="organization"
                placeholder="Company Name (Optional)"
                className={fieldClass}
              />
            </label>
            <label htmlFor="contact-phone">
              <span className={labelClass}>Phone Number</span>
              <input
                id="contact-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                spellCheck={false}
                placeholder="Phone Number"
                required
                className={fieldClass}
              />
            </label>
            <label htmlFor="contact-company-number">
              <span className={labelClass}>Company Number (Optional)</span>
              <input
                id="contact-company-number"
                name="companyNumber"
                type="tel"
                inputMode="tel"
                spellCheck={false}
                placeholder="Company Number (Optional)"
                className={fieldClass}
              />
            </label>
          </div>
          <label htmlFor="contact-message">
            <span className={labelClass}>Your Message</span>
            <textarea
              id="contact-message"
              name="message"
              placeholder="Your Message"
              required
              rows={5}
              className="w-full rounded-2xl border border-current bg-transparent px-5 py-3 text-sm placeholder:opacity-60 focus:outline-2 focus:outline-offset-2 focus:outline-osi-gold-500"
            />
          </label>
          {/* red-600/green-700 (AsyncMessage's default "light" variant) read fine
              on cream/white but too close in luminance to a navy background —
              same cream-vs-navy accent-color branch CLAUDE.md documents for
              gold/slate elsewhere (grep `data.background === "cream"`). */}
          <AsyncMessage
            variant={data.background === "cream" ? "light" : "dark"}
            message={state.status === "error" ? { kind: "error", text: state.message ?? "Something went wrong." } : null}
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-osi-gold-500 px-8 py-3 font-display text-sm tracking-wide-display text-osi-navy-900 uppercase transition-colors hover:bg-osi-gold-400 disabled:opacity-60"
          >
            {pending ? "Sending…" : data.submitLabel}
          </button>
        </form>
      )}
    </Section>
  );
}
