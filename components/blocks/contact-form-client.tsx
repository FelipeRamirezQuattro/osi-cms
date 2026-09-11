"use client";

import { useActionState } from "react";
import { Section } from "@/components/ui/section";
import { submitContactForm, type ContactFormState } from "@/lib/actions/submit-contact-form";
import type { ContactFormData } from "@/components/blocks/contact-form";

const fieldClass =
  "w-full rounded-full border border-current bg-transparent px-5 py-3 text-sm placeholder:opacity-60 focus:outline-2 focus:outline-offset-2 focus:outline-osi-gold-500";

const initialState: ContactFormState = { status: "idle" };

export function ContactFormRender({ data }: { data: ContactFormData }) {
  const [state, formAction, pending] = useActionState(submitContactForm, initialState);

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
    >
      <h2 className="mb-8 font-display text-section tracking-tightest-display uppercase">
        {data.title}
      </h2>
      {state.status === "success" ? (
        <p className="text-sm">Thanks for submitting! We&rsquo;ll be in touch shortly.</p>
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
            <input name="firstName" placeholder="First Name" required className={fieldClass} />
            <input name="lastName" placeholder="Last Name" required className={fieldClass} />
            <input
              name="email"
              type="email"
              placeholder="Email Address"
              required
              className={fieldClass}
            />
            <input name="company" placeholder="Company Name (Optional)" className={fieldClass} />
            <input name="phone" placeholder="Phone Number" required className={fieldClass} />
            <input
              name="companyNumber"
              placeholder="Company Number (Optional)"
              className={fieldClass}
            />
          </div>
          <textarea
            name="message"
            placeholder="Your Message"
            required
            rows={5}
            className="w-full rounded-2xl border border-current bg-transparent px-5 py-3 text-sm placeholder:opacity-60 focus:outline-2 focus:outline-offset-2 focus:outline-osi-gold-500"
          />
          {state.status === "error" && <p className="text-sm text-red-400">{state.message}</p>}
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
