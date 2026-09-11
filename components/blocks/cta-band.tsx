import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { ArrowButton } from "@/components/ui/arrow-button";

const schema = blockCommonSchema.extend({
  headline: z.string(),
  ctaLabel: z.string(),
  ctaHref: z.string().default("#"),
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

export const ctaBandBlock = defineBlock({
  type: "cta_band",
  label: "CTA band",
  category: "layout",
  schema,
  defaults: { background: "navy", spacingTop: "md", spacingBottom: "md", headline: "", ctaLabel: "", ctaHref: "#" },
  Render,
});
