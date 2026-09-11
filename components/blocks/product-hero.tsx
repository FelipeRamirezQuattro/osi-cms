import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { DuotoneImage } from "@/components/ui/duotone-image";
import { CtaBreakoutBar } from "@/components/ui/cta-breakout-bar";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

export const productHeroSchema = blockCommonSchema.extend({
  eyebrow: z.string().optional(),
  title: z.string(),
  paragraphs: z.array(z.string()).max(3).default([]),
  diagramImageUrl: z.string().optional(),
  ctaLabel: z.string().default("Find a distributor"),
  ctaHref: z.string().default("/contact"),
});

export type ProductHeroData = z.infer<typeof productHeroSchema>;

export function ProductHeroRender({ data }: { data: ProductHeroData }) {
  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom="lg"
      anchorId={data.anchorId}
      contentClassName="relative mx-auto max-w-6xl px-6 md:px-12"
    >
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2 md:items-center">
        <div>
          {data.eyebrow && (
            <p className="mb-2 text-xs text-osi-slate-400 uppercase">{data.eyebrow}</p>
          )}
          <h1 className="font-display text-section tracking-tightest-display uppercase">
            {data.title}
          </h1>
          <div className="mt-2 mb-4 h-px w-24 bg-osi-steel-500/50" />
          <div className="space-y-4 text-sm text-osi-slate-300">
            {data.paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
        <DuotoneImage src={data.diagramImageUrl} className="aspect-square w-full" intensity={0.15} />
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
