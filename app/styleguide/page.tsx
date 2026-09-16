import type { Metadata } from "next";
import { ArrowButton } from "@/components/ui/arrow-button";
import { Clipped } from "@/components/ui/clipped";
import { CtaBreakoutBar } from "@/components/ui/cta-breakout-bar";
import { DuotoneImage } from "@/components/ui/duotone-image";
import { HairlineGrid } from "@/components/ui/hairline-grid";
import { AnimatedSection } from "@/components/ui/animated-section";
import { AnimatedGroup, AnimatedItem } from "@/components/ui/animated-group";
import { TiltCard } from "@/components/ui/tilt-card";
import { GradientText } from "@/components/ui/gradient-text";
import { MarqueeStrip } from "@/components/ui/marquee-strip";
import { LabelPlateDemo } from "@/components/styleguide/label-plate-demo";
import { imageBlock } from "@/components/blocks/image";
import { embedBlock } from "@/components/blocks/embed";
import { columnsBlock } from "@/components/blocks/columns";
import { quoteTestimonialBlock } from "@/components/blocks/quote-testimonial";
import { buttonGroupBlock } from "@/components/blocks/button-group";
import { resourceListBlock } from "@/components/blocks/resource-list";
import { imageGalleryBlock } from "@/components/blocks/image-gallery";
import { stagesCarouselBlock } from "@/components/blocks/stages-carousel";
import {
  Divider,
  EmptyState,
  Eyebrow,
  IconButton,
  MediaFrame,
  PublicSkeleton,
  SectionHeader,
  StatusMessage,
} from "@/components/ui/public-primitives";
import { PublicThemeBoundary } from "@/components/branding/public-theme-boundary";
import { resolvePublishedBranding } from "@/lib/branding/resolve";
import { getFontCatalogEntry } from "@/lib/fonts/catalog";

export const metadata: Metadata = {
  title: "Styleguide — OSI",
  robots: { index: false, follow: false },
};

// The resource_list preview below calls lib/data/resources.ts, which
// (like every lib/data/* repository) goes through
// createServerDbClient() — that always touches cookies() (see
// CLAUDE.md's "Every route under app/(site)/..." note), so this route
// needs the same force-dynamic escape hatch or Next's static prerender
// fails the build the moment that call runs.
export const dynamic = "force-dynamic";

const ROLE_LABELS = {
  primary: "Primary",
  secondary: "Secondary",
  accentOnDark: "Accent on dark",
  accentOnLight: "Accent on light",
  lightSurface: "Light surface",
  darkSurface: "Dark surface",
  textOnLight: "Text on light",
  textOnDark: "Text on dark",
  mutedTextOnLight: "Muted text on light",
  mutedTextOnDark: "Muted text on dark",
  borderOnLight: "Border on light",
  borderOnDark: "Border on dark",
  focusIndicator: "Focus indicator",
  error: "Error",
  success: "Success",
  warning: "Warning",
  info: "Information",
} as const;

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
        bg === "navy"
          ? "bg-brand-surface-dark text-brand-text-dark"
          : "bg-brand-surface-light text-brand-text-light"
      } ${className}`}
    >
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  );
}
function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-8 font-editorial text-section font-semibold text-balance">
      {children}
    </h2>
  );
}

export default async function StyleguidePage() {
  const branding = await resolvePublishedBranding();
  const swatchById = new Map(
    branding.config.swatches.map((swatch) => [swatch.id, swatch]),
  );
  const typographyNames = Object.fromEntries(
    Object.entries(branding.config.typography).map(([role, key]) => [
      role,
      getFontCatalogEntry(key)?.family ?? key,
    ]),
  );

  return (
    <PublicThemeBoundary branding={branding}>
      <main>
      <Section bg="navy" className="diagonal-seam-b pb-24">
        <p className="mb-2 font-display text-small-label tracking-wide-label text-brand-accent-dark uppercase">
          OSI design system
        </p>
        <h1 className="font-display text-hero tracking-tightest-display uppercase">Styleguide</h1>
        <p className="mt-4 max-w-xl text-[var(--brand-color-muted-text-on-dark)]">
          Every token and primitive from the mockup, rendered in isolation. This page is the
          fidelity checkpoint — not part of the public site nav, `noindex`.
        </p>
      </Section>

      <Section bg="cream" className="pt-24">
        <Heading>Published brand palette</Heading>
        <p className="mb-8 max-w-2xl text-[var(--brand-color-muted-text-on-light)]">
          These are the governed swatches currently published from the Branding module. Public components consume the semantic roles below rather than depending on a swatch name.
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {branding.config.swatches.map((swatch) => (
            <div key={swatch.id}>
              <div className="h-16 rounded border border-[var(--site-border)]" style={{ background: swatch.hex }} />
              <p className="mt-2 font-display text-xs tracking-wide-label uppercase">{swatch.name}</p>
              <p className="text-xs text-[var(--brand-color-muted-text-on-light)]">{swatch.hex}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section bg="cream">
        <Heading>Semantic color roles</Heading>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(ROLE_LABELS).map(([role, label]) => {
            const reference = branding.config.roles[role as keyof typeof branding.config.roles];
            const swatch = swatchById.get(reference.swatchId);
            return (
              <div key={role} className="rounded border border-[var(--site-border)] bg-[var(--site-surface-raised)] p-4">
                <div className="mb-3 h-10 rounded border border-[var(--site-border)]" style={{ background: swatch?.hex }} />
                <p className="font-display text-xs tracking-wide-label uppercase">{label}</p>
                <p className="mt-1 text-xs text-[var(--brand-color-muted-text-on-light)]">
                  {swatch?.name ?? reference.swatchId}{reference.opacity < 1 ? ` · ${Math.round(reference.opacity * 100)}%` : ""}
                </p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section bg="cream">
        <Heading>Type</Heading>
        <div className="space-y-6">
          <p className="font-display text-hero tracking-tightest-display uppercase">Hero display</p>
          <p className="font-editorial text-section font-semibold text-balance">
            Editorial section title that remains readable across multiple lines
          </p>
          <p className="text-xs text-[var(--brand-color-muted-text-on-light)]">
            The published role mapping is display: {typographyNames.display}, heading: {typographyNames.heading}, body: {typographyNames.body}, and interface/label: {typographyNames.label}.
          </p>
          <p className="font-display text-card-label tracking-wide-display uppercase">
            Card label
          </p>
          <p className="max-w-xl text-base">
            Body copy uses {typographyNames.body} at a comfortable 1.7 line-height,
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

      <Section bg="cream">
        <Heading>Public semantic primitives</Heading>
        <div className="space-y-10">
          <SectionHeader
            eyebrow="Engineered clarity"
            title="A long section heading remains calm, legible, and balanced when content expands"
            lede="This fixture covers the shared eyebrow, editorial title, reading measure, and muted copy roles used by public blocks."
          />
          <Divider />
          <div className="grid gap-5 md:grid-cols-2">
            <MediaFrame />
            <div className="space-y-4">
              <StatusMessage title="Request received" tone="success">
                A specialist will follow up with the next steps.
              </StatusMessage>
              <StatusMessage title="Something needs attention" tone="error">
                Review the highlighted fields and try again.
              </StatusMessage>
              <div className="flex items-center gap-3">
                <IconButton label="Example icon action">
                  <span aria-hidden>+</span>
                </IconButton>
                <IconButton label="Unavailable action" disabled>
                  <span aria-hidden>+</span>
                </IconButton>
                <Eyebrow>A translated label can expand safely</Eyebrow>
              </div>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <EmptyState
              title="No resources match this view"
              description="Try a broader filter or return to the complete resource library."
              action={<ArrowButton href="/resources" variant="outline-dark">View all resources</ArrowButton>}
            />
            <PublicSkeleton lines={4} />
          </div>
        </div>
      </Section>

      <Section bg="navy" className="diagonal-seam-b diagonal-seam-t pb-24">
        <Heading>Hairline grid + stat band</Heading>
        <div className="relative grid grid-cols-1 gap-px sm:grid-cols-3">
          <HairlineGrid cols={3} rows={2} className="-inset-x-5 md:-inset-x-10" />
          {["$480 million", "40,000+", "120%"].map((stat, i) => (
            <div key={stat} className="relative z-10 p-8">
              <p className="font-display text-3xl tracking-tightest-display text-osi-gold-500 uppercase">
                {stat}
              </p>
              <p className="mt-2 text-sm text-osi-slate-200">
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

      <Section bg="navy" className="pb-24">
        <Heading>Motion foundation</Heading>
        <p className="max-w-2xl text-osi-slate-200">
          Public motion is event-driven: 160–220ms feedback, 260–400ms reveals, an 8px maximum entrance offset, and no ambient decorative loops. Use Tab, hover, and press on the controls above to inspect the interaction states.
        </p>
      </Section>

      <Section bg="navy" className="pt-0 pb-24">
        <p className="mb-2 font-display text-small-label tracking-wide-label uppercase">
          <GradientText>Gradient text</GradientText>
        </p>
        <p className="max-w-md text-osi-slate-200">
          Reserved for a single eyebrow/kicker or one hero word — navy backgrounds only.
        </p>
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

      <Section bg="cream">
        <Heading>Tilt card</Heading>
        <TiltCard className="aspect-video max-w-sm rounded bg-osi-navy-700">
          <div className="flex h-full items-center justify-center font-display text-sm tracking-wide-display text-osi-white uppercase">
            Move your cursor over this card
          </div>
        </TiltCard>
      </Section>

      <Section bg="cream">
        <Heading>Marquee</Heading>
        <MarqueeStrip>
          {["Alpha Corp", "Beta Industries", "Gamma Energy", "Delta Field Services"].map((name) => (
            <span key={name} className="shrink-0 font-display text-sm tracking-wide-display uppercase">
              {name}
            </span>
          ))}
        </MarqueeStrip>
      </Section>

      <Section bg="cream" className="pb-32">
        <Heading>Breakout CTA bar</Heading>
        <div className="relative h-24 overflow-visible rounded bg-osi-navy-700">
          <CtaBreakoutBar href="#">Find a distributor</CtaBreakoutBar>
        </div>
      </Section>

      {/* Task 9 (CMS remediation plan): previews of the 6 new general-
          purpose blocks, rendered via their real block.Render — same
          pattern the rest of this page uses for design-system
          primitives, applied to full block instances since no per-block
          preview convention pre-existed here. */}
      <Section bg="cream" className="pt-24">
        <Heading>New blocks — Image</Heading>
      </Section>
      <imageBlock.Render
        data={imageBlock.schema.parse({
          imageUrl: "https://static.wixstatic.com/media/1ac9e9_f50ca309b071438d93fa3c37869c83baf000.jpg",
          alt: "A gas release system installed in the field",
          aspectRatio: "16:9",
          alignment: "center",
          caption: "Gas Release System, field installation",
          credit: "Odessa Separator Inc.",
        })}
      />

      <Section bg="cream">
        <Heading>New blocks — Embed (sandboxed iframes)</Heading>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <embedBlock.Render
            data={embedBlock.schema.parse({
              provider: "youtube",
              url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
              title: "YouTube embed example",
              aspectRatio: "16:9",
            })}
          />
          <embedBlock.Render
            data={embedBlock.schema.parse({
              provider: "vimeo",
              url: "https://vimeo.com/76979871",
              title: "Vimeo embed example",
              aspectRatio: "16:9",
            })}
          />
          <embedBlock.Render
            data={embedBlock.schema.parse({
              provider: "google_maps",
              url: "https://www.google.com/maps?q=Odessa,+TX&output=embed",
              title: "Google Maps embed example",
              aspectRatio: "1:1",
            })}
          />
        </div>
      </Section>

      <Section bg="cream">
        <Heading>New blocks — Columns (text / image / cta, no nesting)</Heading>
      </Section>
      <columnsBlock.Render
        data={columnsBlock.schema.parse({
          columns: [
            { type: "text", heading: "Built to last", body: "Field-proven equipment since 1995." },
            { type: "image", imageUrl: "https://static.wixstatic.com/media/1ac9e9_40095ee183db4ad0b94815d65e596dec~mv2.jpeg", imageAlt: "ESP Chem Screen" },
            { type: "cta", ctaLabel: "Contact us", ctaHref: "/contact" },
          ],
        })}
      />

      <Section bg="navy">
        <Heading>New blocks — Quote / testimonial</Heading>
      </Section>
      <quoteTestimonialBlock.Render
        data={quoteTestimonialBlock.schema.parse({
          quote: "Odessa Separator's equipment has never let us down in twenty years of field service.",
          attributionName: "Jane Doe",
          roleCompany: "Field Operations Manager, Example Energy",
        })}
      />

      <Section bg="cream">
        <Heading>New blocks — Button group</Heading>
      </Section>
      <buttonGroupBlock.Render
        data={buttonGroupBlock.schema.parse({
          buttons: [
            { label: "Contact us", href: "/contact" },
            { label: "See products", href: "/products" },
          ],
          alignment: "center",
        })}
      />

      <Section bg="cream">
        <Heading>New blocks — Resource list</Heading>
        <p className="mb-6 max-w-xl text-xs text-osi-slate-400">
          Real data fetch against `resources` — renders its genuine empty state below since that table
          has 0 published rows in this environment (see CLAUDE.md&rsquo;s Known content gaps).
        </p>
      </Section>
      <resourceListBlock.Render
        data={resourceListBlock.schema.parse({ title: "Resources" })}
      />

      <Section bg="cream">
        <Heading>Interactive media — gallery</Heading>
        <p className="max-w-xl text-sm text-osi-slate-300">
          Open either image to inspect the modal viewer, keyboard navigation, visible controls, and focus restoration.
        </p>
      </Section>
      <imageGalleryBlock.Render
        data={imageGalleryBlock.schema.parse({
          title: "Field equipment gallery",
          images: [
            {
              url: "https://static.wixstatic.com/media/1ac9e9_f50ca309b071438d93fa3c37869c83baf000.jpg",
              alt: "Gas release system installed in the field",
            },
            {
              url: "https://static.wixstatic.com/media/1ac9e9_40095ee183db4ad0b94815d65e596dec~mv2.jpeg",
              alt: "ESP chemical screen assembly",
            },
          ],
        })}
      />

      <Section bg="cream">
        <Heading>Interactive media — stages</Heading>
      </Section>
      <stagesCarouselBlock.Render
        data={stagesCarouselBlock.schema.parse({
          title: "Process stages",
          stages: [
            { title: "Separation", body: "The first stage establishes a clear technical sequence." },
            { title: "Conditioning", body: "The second stage verifies keyboard, button, and swipe navigation." },
          ],
        })}
      />

      <Section bg="navy">
        <Heading>Scroll reveal</Heading>
        <AnimatedSection>
          <p className="max-w-md text-osi-slate-200">
            Scroll this card out of view and back — it fades and rises once, 400ms, and is inert
            under prefers-reduced-motion.
          </p>
        </AnimatedSection>
        <AnimatedGroup className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {["One", "Two", "Three"].map((label) => (
            <AnimatedItem key={label} className="rounded bg-osi-steel-500/20 p-6">
              <p className="font-display text-sm tracking-wide-display text-osi-white uppercase">
                {label}
              </p>
            </AnimatedItem>
          ))}
        </AnimatedGroup>
      </Section>
      </main>
    </PublicThemeBoundary>
  );
}
