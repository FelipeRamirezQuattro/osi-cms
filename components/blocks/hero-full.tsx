import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { DuotoneImage } from "@/components/ui/duotone-image";
import { ArrowButton } from "@/components/ui/arrow-button";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const ctaSchema = z.object({
  label: z.string(),
  href: z.string(),
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
  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom="lg"
      anchorId={data.anchorId}
      reveal={false}
      seam="bottom"
      className="min-h-[70vh]"
      contentClassName="relative mx-auto flex min-h-[calc(70vh-6rem)] max-w-6xl flex-col justify-center px-6 md:px-12"
    >
      <div className="absolute inset-0 -z-10">
        <DuotoneImage src={data.imageUrl} className="h-full w-full" intensity={0.5} />
      </div>
      {data.eyebrow && (
        <p
          className={`mb-3 font-display text-small-label tracking-wide-label uppercase ${
            data.background === "cream" ? "text-osi-gold-700" : "text-osi-gold-500"
          }`}
        >
          {data.eyebrow}
        </p>
      )}
      <h1 className="max-w-2xl font-display text-hero tracking-tightest-display text-osi-white uppercase">
        {data.headline}
      </h1>
      {data.subhead && (
        <p className={`mt-4 max-w-xl ${data.background === "cream" ? "text-osi-slate-300" : "text-osi-slate-200"}`}>
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
  schema,
  defaults: { background: "navy", spacingTop: "md", spacingBottom: "lg", headline: "", ctas: [] },
  Render,
  adminFields,
});
