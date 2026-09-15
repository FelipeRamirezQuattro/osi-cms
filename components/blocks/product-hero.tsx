import { z } from "zod";
import { resolveMediaUrl } from "@/lib/media";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { CtaBreakoutBar } from "@/components/ui/cta-breakout-bar";
import { GradientText } from "@/components/ui/gradient-text";
import { TechnicalImageViewer } from "@/components/blocks/image-gallery-client";
import { requiredString, safeHrefSchema } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

export const productHeroSchema = blockCommonSchema.extend({
  eyebrow: z.string().optional(),
  title: requiredString("Title"),
  paragraphs: z.array(z.string()).max(3).default([]),
  diagramImageUrl: z.string().optional(),
  ctaLabel: z.string().default("Find a distributor"),
  ctaHref: safeHrefSchema({ allowAnchor: true, label: "CTA link", defaultValue: "/contact" }),
});

export type ProductHeroData = z.infer<typeof productHeroSchema>;

export function ProductHeroRender({ data }: { data: ProductHeroData }) {
  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom="lg"
      anchorId={data.anchorId}
      reveal={false}
      contentClassName="relative mx-auto max-w-[var(--site-container)] px-5 md:px-10"
    >
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,1.1fr)] lg:items-center lg:gap-14">
        <div className="max-w-[var(--site-reading-width)]">
          {data.eyebrow && (
            <p className="mb-2 text-xs uppercase">
              {data.background === "navy" ? (
                // Navy is the ONLY background GradientText is safe on
                // (see gradient-text.tsx). "transparent" renders
                // `bg-transparent`, letting the cream page body through,
                // so it takes the solid gold-700 fallback alongside
                // "cream" — that is the single WCAG-safe gold there, and
                // there is no two-stop sweep to run with one colour.
                <GradientText>{data.eyebrow}</GradientText>
              ) : (
                <span className="text-osi-gold-700">{data.eyebrow}</span>
              )}
            </p>
          )}
          <h1 className="font-display text-[clamp(2rem,5vw,3.75rem)] leading-[1.06] tracking-tightest-display text-balance uppercase [overflow-wrap:anywhere]">
            {data.title}
          </h1>
          <div className="mt-2 mb-4 h-px w-24 bg-osi-steel-500/50" />
          <div
            className={`space-y-4 text-base leading-relaxed ${
              data.background === "cream" ? "text-osi-slate-300" : "text-osi-slate-200"
            }`}
          >
            {data.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
        {/* Deliberately not a DuotoneImage. That primitive is built for
            photography: it crops with object-cover and applies
            grayscale + a navy multiply. Both are wrong for a technical
            diagram — cropping cuts the drawing off, and the desaturation
            mutes the colour-coded flow paths the body copy refers to by
            name ("red flow path", "green flow path", "yellow flow path").
            Contained, full-colour, on a light plate so the drawing's own
            white background doesn't float on navy. */}
        {data.diagramImageUrl ? (
          <TechnicalImageViewer
            image={{ url: resolveMediaUrl(data.diagramImageUrl), alt: `${data.title} diagram` }}
            title={`${data.title} diagram`}
          />
        ) : (
          <div className="flex aspect-[4/3] w-full items-end rounded-[var(--site-radius-lg)] border border-white/15 bg-osi-white/8 p-6 text-sm text-osi-slate-200">
            Technical image unavailable
          </div>
        )}
      </div>
      <CtaBreakoutBar href={data.ctaHref}>{data.ctaLabel}</CtaBreakoutBar>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "eyebrow", label: "Eyebrow", type: "text", optional: true },
  { key: "title", label: "Title", type: "text" },
  { key: "paragraphs", label: "Paragraphs", type: "array", maxItems: 3 },
  { key: "diagramImageUrl", label: "Diagram image", type: "image", optional: true },
  { key: "ctaLabel", label: "CTA label", type: "text" },
  { key: "ctaHref", label: "CTA link", type: "text" },
];

export const productHeroBlock = defineBlock({
  type: "product_hero",
  label: "Product hero",
  category: "commerce",
  description: "Product detail's own hero (title, paragraphs, diagram image, CTA) — used directly by the product detail page template, not selectable in the generic page-block picker for other pages.",
  schema: productHeroSchema,
  adminFields,
  defaults: {
    background: "navy",
    spacingTop: "md",
    spacingBottom: "lg",
    title: "",
    paragraphs: [],
    ctaLabel: "Find a distributor",
    ctaHref: "/contact",
  },
  Render: ProductHeroRender,
});
