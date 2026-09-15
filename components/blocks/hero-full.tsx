import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { DuotoneImage } from "@/components/ui/duotone-image";
import { ArrowButton } from "@/components/ui/arrow-button";
import { GradientText } from "@/components/ui/gradient-text";
import { requiredString, safeHrefSchema } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const ctaSchema = z.object({
  label: requiredString("CTA label"),
  href: safeHrefSchema({ allowAnchor: true, label: "CTA link" }),
  variant: z.enum(["outline-light", "outline-dark", "solid-gold", "ghost-arrow"]).default("outline-light"),
});

const schema = blockCommonSchema.extend({
  eyebrow: z.string().optional(),
  headline: z.string(),
  subhead: z.string().optional(),
  imageUrl: z.string().optional(),
  ctas: z.array(ctaSchema).max(2).default([]),
});

type Data = z.infer<typeof schema>;

function Render({ data }: { data: Data }) {
  const useEditorialTitle = data.headline.length > 36;

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom="lg"
      anchorId={data.anchorId}
      reveal={false}
      seam="bottom"
      className="min-h-[88vh]"
      // No `relative` here, deliberately: the -z-10 backdrop below is
      // absolute inset-0, so it anchors to the nearest positioned
      // ancestor. With `relative` on this padded, max-w-6xl column the
      // photo was boxed to the text column — leaving bare navy above it
      // (the section's own padding) and down both sides on desktop. The
      // <section> is already `relative`, so dropping it here lets the
      // backdrop cover the whole section edge-to-edge, which is what the
      // mockup's hero shows.
      contentClassName="mx-auto flex min-h-[calc(88vh-8rem)] max-w-[var(--site-container)] flex-col justify-center px-5 md:px-10"
    >
      <div className="absolute inset-0 -z-10">
        <DuotoneImage src={data.imageUrl} className="h-full w-full" intensity={0.5} sizes="100vw" loading="eager" />
        {/* Scrim. The duotone alone was enough over the gradient
            placeholder, but a real photograph has bright regions (the sky
            in the yard shot) where slate-200 subhead copy drops under 4.5:1.
            Darkening toward the left/bottom — where the copy sits — keeps
            the headline and subhead legible without flattening the whole
            image the way a higher duotone intensity would. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-osi-navy-900/85 via-osi-navy-900/55 to-osi-navy-900/20"
        />
      </div>
      {data.eyebrow && (
        <p className="mb-3 font-display text-small-label tracking-wide-label uppercase">
          {/* No `data.background` branch here, unlike hero_page/
              product_hero: this block always paints its own full-bleed
              navy-multiplied DuotoneImage behind the content (see the
              -z-10 layer above), so `background` never describes what is
              actually behind this text — the backdrop is dark whichever
              value is set, which is also why the h1 below is
              unconditionally text-osi-white. GradientText's navy-safe
              gold-500/400 is therefore the right choice for every value;
              the dark gold-700 cream fallback used elsewhere would read
              at roughly 1.9:1 against that duotone. */}
          <GradientText>{data.eyebrow}</GradientText>
        </p>
      )}
      <h1
        className={`max-w-3xl text-hero text-balance text-osi-white [overflow-wrap:anywhere] ${
          useEditorialTitle
            ? "font-editorial font-semibold leading-[1.03]"
            : "font-display tracking-tightest-display uppercase"
        }`}
      >
        {data.headline}
      </h1>
      {data.subhead && (
        <p className={`mt-5 max-w-[60ch] text-base font-medium leading-relaxed ${data.background === "cream" ? "text-osi-slate-300" : "text-white/78"}`}>
          {data.subhead}
        </p>
      )}
      {data.ctas.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-4">
          {data.ctas.map((cta) => (
            <ArrowButton key={cta.label} href={cta.href} variant={cta.variant}>
              {cta.label}
            </ArrowButton>
          ))}
        </div>
      )}
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "eyebrow", label: "Eyebrow", type: "text", optional: true },
  { key: "headline", label: "Headline", type: "text" },
  { key: "subhead", label: "Subhead", type: "textarea", optional: true },
  { key: "imageUrl", label: "Background image", type: "image", optional: true },
  {
    key: "ctas",
    label: "Buttons",
    type: "array",
    maxItems: 2,
    itemFields: [
      { key: "label", label: "Label", type: "text" },
      { key: "href", label: "Link", type: "text" },
      {
        key: "variant",
        label: "Style",
        type: "select",
        options: ["outline-light", "outline-dark", "solid-gold", "ghost-arrow"],
      },
    ],
  },
];

export const heroFullBlock = defineBlock({
  type: "hero_full",
  label: "Full-bleed hero",
  category: "hero",
  description: "Full-bleed photo hero with a headline, optional subhead, and up to two CTAs — use for the homepage or a top-of-funnel landing page.",
  schema,
  defaults: { background: "navy", spacingTop: "md", spacingBottom: "lg", headline: "", ctas: [] },
  Render,
  adminFields,
});
