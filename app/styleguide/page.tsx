import type { Metadata } from "next";
import { ArrowButton } from "@/components/ui/arrow-button";
import { Clipped } from "@/components/ui/clipped";
import { CtaBreakoutBar } from "@/components/ui/cta-breakout-bar";
import { DuotoneImage } from "@/components/ui/duotone-image";
import { HairlineGrid } from "@/components/ui/hairline-grid";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { LabelPlateDemo } from "@/components/styleguide/label-plate-demo";

export const metadata: Metadata = {
  title: "Styleguide — OSI",
  robots: { index: false, follow: false },
};

const COLORS = [
  ["osi-navy-900", "#001B33"],
  ["osi-navy-800", "#001C34"],
  ["osi-navy-700", "#04243D"],
  ["osi-navy-600", "#133752"],
  ["osi-steel-500", "#234E7B"],
  ["osi-slate-400", "#4C6880"],
  ["osi-slate-300", "#576979"],
  ["osi-cream-100", "#F2E9DE"],
  ["osi-cream-200", "#EFE8DD"],
  ["osi-sand-300", "#D0C0A7"],
  ["osi-gold-500", "#E2902A"],
  ["osi-gold-400", "#F0A93D"],
] as const;

function Section({
  bg,
  children,
  className = "",
}: {
  bg: "navy" | "cream";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative overflow-visible px-6 py-16 md:px-12 ${
        bg === "navy" ? "bg-osi-navy-900 text-osi-white" : "bg-osi-cream-100 text-osi-navy-900"
      } ${className}`}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-8 font-display text-section tracking-tightest-display uppercase">
      {children}
    </h2>
  );
}

export default function StyleguidePage() {
  return (
    <main>
      <Section bg="navy" className="diagonal-seam-b pb-24">
        <p className="mb-2 font-display text-small-label tracking-wide-label text-osi-gold-500 uppercase">
          OSI design system
        </p>
        <h1 className="font-display text-hero tracking-tightest-display uppercase">Styleguide</h1>
        <p className="mt-4 max-w-xl text-osi-slate-300">
          Every token and primitive from the mockup, rendered in isolation. This page is the
          fidelity checkpoint — not part of the public site nav, `noindex`.
        </p>
      </Section>

      <Section bg="cream" className="pt-24">
        <Heading>Color</Heading>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {COLORS.map(([name, hex]) => (
            <div key={name}>
              <div className="h-16 rounded border border-osi-sand-300" style={{ background: hex }} />
              <p className="mt-2 font-display text-xs tracking-wide-label uppercase">{name}</p>
              <p className="text-xs text-osi-slate-400">{hex}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section bg="cream">
        <Heading>Type</Heading>
        <div className="space-y-6">
          <p className="font-display text-hero tracking-tightest-display uppercase">Hero display</p>
          <p className="font-display text-section tracking-tightest-display uppercase">
            Section title
          </p>
          <p className="font-display text-card-label tracking-wide-display uppercase">
            Card label
          </p>
          <p className="max-w-xl text-base">
            Body copy runs light and airy — 300&ndash;400 weight Montserrat at 1.7 line-height,
            never dense. This is a sample paragraph long enough to show the measure and rhythm the
            mockup uses throughout prose sections.
          </p>
          <p className="font-display text-small-label tracking-wide-label uppercase">
            Small label
          </p>
        </div>
      </Section>

      <Section bg="cream">
        <Heading>Circled-arrow button</Heading>
        <div className="flex flex-wrap items-center gap-4">
          <ArrowButton variant="outline-dark">Services</ArrowButton>
          <ArrowButton variant="solid-gold">Get in touch</ArrowButton>
          <ArrowButton variant="ghost-arrow">Learn more</ArrowButton>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded bg-osi-navy-900 p-6">
          <ArrowButton variant="outline-light">Services</ArrowButton>
          <ArrowButton variant="ghost-arrow">Connect with a specialist</ArrowButton>
        </div>
      </Section>

      <Section bg="navy" className="diagonal-seam-b diagonal-seam-t pb-24">
        <Heading>Hairline grid + stat band</Heading>
        <div className="relative grid grid-cols-1 gap-px sm:grid-cols-3">
          <HairlineGrid cols={3} rows={2} className="-inset-x-6 md:-inset-x-12" />
          {["$480 million", "40,000+", "120%"].map((stat, i) => (
            <div key={stat} className="relative z-10 p-8">
              <p className="font-display text-3xl tracking-tightest-display text-osi-gold-500 uppercase">
                {stat}
              </p>
              <p className="mt-2 text-sm text-osi-slate-300">
                {i === 0
                  ? "CAPEX and OPEX savings in the last 5 years"
                  : i === 1
                    ? "Wells optimized since 1995"
                    : "Average runtime increase"}
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section bg="cream" className="pt-24">
        <Heading>Label-plate card (one open per grid)</Heading>
        <LabelPlateDemo />
      </Section>

      <Section bg="navy">
        <Heading>Duotone image + clipped corners</Heading>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <DuotoneImage className="aspect-video" />
          <Clipped corner="br" size="2rem" className="aspect-video bg-osi-steel-500" />
          <Clipped corner={["tl", "br"]} size="2rem" className="aspect-video bg-osi-gold-500" />
        </div>
      </Section>

      <Section bg="cream" className="pb-32">
        <Heading>Breakout CTA bar</Heading>
        <div className="relative h-24 overflow-visible rounded bg-osi-navy-700">
          <CtaBreakoutBar href="#">Find a distributor</CtaBreakoutBar>
        </div>
      </Section>

      <Section bg="navy">
        <Heading>Scroll reveal</Heading>
        <ScrollReveal>
          <p className="max-w-md text-osi-slate-300">
            Scroll this card out of view and back — it fades and rises once, 400ms, and is inert
            under prefers-reduced-motion.
          </p>
        </ScrollReveal>
      </Section>
    </main>
  );
}
