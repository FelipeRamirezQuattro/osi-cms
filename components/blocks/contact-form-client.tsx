"use client";

import { useActionState } from "react";
import { Section } from "@/components/ui/section";
import { StatusMessage } from "@/components/ui/public-primitives";
import {
  PUBLIC_FIELD_CLASS,
  PUBLIC_LABEL_CLASS,
  PUBLIC_SUBMIT_CLASS,
  PUBLIC_TEXTAREA_CLASS,
} from "@/components/ui/public-form-styles";
import { submitContactForm, type ContactFormState } from "@/lib/actions/submit-contact-form";
import type { ContactFormData } from "@/components/blocks/contact-form";

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
      <h2 className="mb-8 font-editorial text-section font-semibold text-balance">
        {data.title}
      </h2>
      {state.status === "success" ? (
        <StatusMessage title="Thanks for reaching out" tone="success">
          We&rsquo;ll be in touch shortly.
        </StatusMessage>
      ) : (
        <form action={formAction} aria-busy={pending} className="max-w-4xl space-y-5">
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
              <span className={PUBLIC_LABEL_CLASS}>First name</span>
              <input
                id="contact-first-name"
                name="firstName"
                type="text"
                autoComplete="given-name"
                placeholder="First Name"
                required
                className={PUBLIC_FIELD_CLASS}
              />
            </label>
            <label htmlFor="contact-last-name">
              <span className={PUBLIC_LABEL_CLASS}>Last name</span>
              <input
                id="contact-last-name"
                name="lastName"
                type="text"
                autoComplete="family-name"
                placeholder="Last Name"
                required
                className={PUBLIC_FIELD_CLASS}
              />
            </label>
            <label htmlFor="contact-email">
              <span className={PUBLIC_LABEL_CLASS}>Email address</span>
              <input
                id="contact-email"
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
            <label htmlFor="contact-company">
              <span className={PUBLIC_LABEL_CLASS}>Company name <span className="font-normal opacity-70">(optional)</span></span>
              <input
                id="contact-company"
                name="company"
                type="text"
                autoComplete="organization"
                placeholder="Company Name (Optional)"
                className={PUBLIC_FIELD_CLASS}
              />
            </label>
            <label htmlFor="contact-phone">
              <span className={PUBLIC_LABEL_CLASS}>Phone number</span>
              <input
                id="contact-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                spellCheck={false}
                placeholder="Phone Number"
                required
                className={PUBLIC_FIELD_CLASS}
              />
            </label>
            <label htmlFor="contact-company-number">
              <span className={PUBLIC_LABEL_CLASS}>Company number <span className="font-normal opacity-70">(optional)</span></span>
              <input
                id="contact-company-number"
                name="companyNumber"
                type="tel"
                inputMode="tel"
                spellCheck={false}
                placeholder="Company Number (Optional)"
                className={PUBLIC_FIELD_CLASS}
              />
            </label>
          </div>
          <label htmlFor="contact-message">
            <span className={PUBLIC_LABEL_CLASS}>Your message</span>
            <textarea
              id="contact-message"
              name="message"
              placeholder="Your Message"
              required
              rows={5}
              className={PUBLIC_TEXTAREA_CLASS}
            />
          </label>
          {state.status === "error" && (
            <StatusMessage title="We couldn’t send your message" tone="error">
              {state.message ?? "Something went wrong. Please review the form and try again."}
            </StatusMessage>
          )}
          <button
            type="submit"
            disabled={pending}
            className={PUBLIC_SUBMIT_CLASS}
          >
            {pending ? "Sending…" : data.submitLabel}
          </button>
        </form>
      )}
    </Section>
  );
}
