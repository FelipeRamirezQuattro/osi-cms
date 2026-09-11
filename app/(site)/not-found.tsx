import type { Metadata } from "next";
import { Section } from "@/components/ui/section";
import { ArrowButton } from "@/components/ui/arrow-button";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <Section background="navy" spacingTop="lg" spacingBottom="lg" contentClassName="mx-auto max-w-2xl px-6 text-center md:px-12">
      <p className="mb-4 font-display text-small-label tracking-wide-label text-osi-gold-500 uppercase">404</p>
      <h1 className="font-display text-section tracking-tightest-display uppercase">Page not found</h1>
      <p className="mt-4 text-osi-slate-200">
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved. Try the homepage, or search for
        what you need.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <ArrowButton href="/" variant="solid-gold">
          Back to home
        </ArrowButton>
        <ArrowButton href="/search" variant="outline-light">
          Search the site
        </ArrowButton>
      </div>
    </Section>
  );
}
