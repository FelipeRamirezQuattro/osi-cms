import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { Clipped } from "@/components/ui/clipped";
import { AnimatedGroup, AnimatedItem } from "@/components/ui/animated-group";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

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
      reveal={false}
    >
      <h2 className="mb-8 font-display text-section tracking-tightest-display uppercase">
        {data.title}
      </h2>
      <AnimatedGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.items.map((item) => (
          <AnimatedItem key={item.title} className="h-full">
            <Clipped
              corner="br"
              size="1.25rem"
              className="h-full border border-osi-steel-500/30 bg-osi-navy-600/40 p-6 transition-colors duration-300 hover:border-osi-steel-500/60 hover:bg-osi-navy-600/60"
            >
              <h3 className="font-display text-sm tracking-wide-display uppercase">{item.title}</h3>
              {item.body && <p className="mt-2 text-sm opacity-80">{item.body}</p>}
            </Clipped>
          </AnimatedItem>
        ))}
      </AnimatedGroup>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "title", label: "Title", type: "text" },
  {
    key: "items",
    label: "Items",
    type: "array",
    minItems: 1,
    maxItems: 6,
    itemFields: [
      { key: "title", label: "Title", type: "text" },
      { key: "body", label: "Body", type: "textarea", optional: true },
    ],
  },
];

export const benefitsCardsBlock = defineBlock({
  type: "benefits_cards",
  label: "Benefits cards",
  category: "commerce",
  schema: benefitsCardsSchema,
  adminFields,
  defaults: { background: "navy", spacingTop: "md", spacingBottom: "md", title: "Benefits", items: [] },
  Render: BenefitsCardsRender,
});
