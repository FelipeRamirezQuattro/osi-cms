"use client";

import { useEffect } from "react";
import { Section } from "@/components/ui/section";
import { ArrowButton } from "@/components/ui/arrow-button";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Section
      background="navy"
      spacingTop="lg"
      spacingBottom="lg"
      contentClassName="mx-auto max-w-2xl px-6 text-center md:px-12"
    >
      <p className="mb-4 text-xs font-semibold tracking-[0.1em] text-osi-gold-400 uppercase">
        Something went wrong
      </p>
      <h1 className="font-editorial text-section font-semibold text-balance">
        We hit a snag loading this page
      </h1>
      <p className="mt-4 text-osi-slate-200">
        Try again, or head back to the homepage. If this keeps happening, let us know via the contact page.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <ArrowButton variant="solid-gold" onClick={reset}>
          Try again
        </ArrowButton>
        <ArrowButton href="/" variant="outline-light">
          Back to home
        </ArrowButton>
      </div>
    </Section>
  );
}
