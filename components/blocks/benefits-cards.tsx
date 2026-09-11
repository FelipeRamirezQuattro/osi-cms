import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { Clipped } from "@/components/ui/clipped";

const itemSchema = z.object({ title: z.string(), body: z.string().optional() });

export const benefitsCardsSchema = blockCommonSchema.extend({
  title: z.string().default("Benefits"),
  items: z.array(itemSchema).min(1).max(6),
});

export type BenefitsCardsData = z.infer<typeof benefitsCardsSchema>;

export function BenefitsCardsRender({ data }: { data: BenefitsCardsData }) {
  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
    >
      <h2 className="mb-8 font-display text-section tracking-tightest-display uppercase">
        {data.title}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.items.map((item) => (
          <Clipped
            key={item.title}
            corner="br"
            size="1.25rem"
            className="border border-osi-steel-500/30 bg-osi-navy-600/40 p-6"
          >
            <h3 className="font-display text-sm tracking-wide-display uppercase">{item.title}</h3>
            {item.body && <p className="mt-2 text-sm opacity-80">{item.body}</p>}
          </Clipped>
        ))}
      </div>
    </Section>
  );
}

export const benefitsCardsBlock = defineBlock({
  type: "benefits_cards",
  label: "Benefits cards",
  category: "commerce",
  schema: benefitsCardsSchema,
  defaults: { background: "navy", spacingTop: "md", spacingBottom: "md", title: "Benefits", items: [] },
  Render: BenefitsCardsRender,
});
