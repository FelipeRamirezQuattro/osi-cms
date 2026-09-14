import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { ArrowButton } from "@/components/ui/arrow-button";
import { requiredString, safeHrefSchema } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const schema = blockCommonSchema.extend({
  headline: requiredString("Headline"),
  ctaLabel: requiredString("CTA label"),
  ctaHref: safeHrefSchema({ allowAnchor: true, label: "CTA link" }),
});

type Data = z.infer<typeof schema>;

function Render({ data }: { data: Data }) {
  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      contentClassName="mx-auto flex max-w-6xl flex-col items-center gap-6 px-6 text-center md:flex-row md:justify-between md:text-left"
    >
      <h2 className="font-display text-section tracking-tightest-display uppercase">
        {data.headline}
      </h2>
      <ArrowButton href={data.ctaHref} variant="solid-gold">
        {data.ctaLabel}
      </ArrowButton>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "headline", label: "Headline", type: "text" },
  { key: "ctaLabel", label: "CTA label", type: "text" },
  { key: "ctaHref", label: "CTA link", type: "text" },
];

export const ctaBandBlock = defineBlock({
  type: "cta_band",
  label: "CTA band",
  category: "layout",
  schema,
  adminFields,
  // "#" used to be the placeholder default here, but that's exactly the
  // dead-link pattern safeHrefSchema now rejects — a freshly-added block
  // needs a real (if generic) destination until the editor sets its own.
  defaults: { background: "navy", spacingTop: "md", spacingBottom: "md", headline: "", ctaLabel: "", ctaHref: "/contact" },
  Render,
});
