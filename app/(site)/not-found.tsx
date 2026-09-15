import type { Metadata } from "next";
import { Section } from "@/components/ui/section";
import { ArrowButton } from "@/components/ui/arrow-button";

// Deliberately no `title` override here (just the root layout's bare
// default, "Odessa Separator Inc.", applies — notFound() also auto-
// injects the noindex meta tag per Next's docs, so `robots` here is
// belt-and-suspenders) — found the hard way (a real e2e run, Task 8
// review fix) that a templated title like "Page not found | Odessa
// Separator Inc." reads as a *resolved* page to
// tests/e2e/navigation-links.spec.ts's broken-link detector, which
// specifically keys off the untemplated bare default as its "this
// didn't resolve to anything" signal. That detector has to work for
// every route this fix's proxy.ts rewrite touches, so this page's title
// can't distinguish itself from the site-wide default the way a normal
// page's title would.
export const metadata: Metadata = { robots: { index: false } };

// Exported by name (not just default) so app/(site-404)/not-found.tsx —
// the chrome-preserving genuine-404 route proxy.ts rewrites a
// confirmed-missing slug to (see proxy.ts's top comment) — can render
// the exact same on-brand content without duplicating it.
export function NotFound() {
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

export default NotFound;
