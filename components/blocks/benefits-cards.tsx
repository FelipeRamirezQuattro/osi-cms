import type { CSSProperties } from "react";
import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { AnimatedGroup, AnimatedItem } from "@/components/ui/animated-group";
import type { FieldSpec } from "@/lib/blocks/admin-fields";
import { longTitle } from "@/lib/text/long-title";
import { cardGridColumns } from "@/lib/blocks/balanced-columns";

const itemSchema = z.object({ title: z.string(), body: z.string().optional() });

export const benefitsCardsSchema = blockCommonSchema.extend({
  title: z.string().default("Benefits"),
  items: z.array(itemSchema).min(1).max(12),
});

export type BenefitsCardsData = z.infer<typeof benefitsCardsSchema>;

export function BenefitsCardsRender({ data }: { data: BenefitsCardsData }) {
  const light = data.background === "cream";
  const cols = cardGridColumns(data.items.length);
  // Column counts are chosen per breakpoint so the last row is never a single
  // card; the grid reads them from custom properties (see balanced-columns.ts).
  const gridStyle = { "--bc-sm": cols.sm, "--bc-lg": cols.lg, "--bc-xl": cols.xl } as CSSProperties;
  const cell = light
    ? "border-[var(--brand-color-border-on-light)] bg-white/60 before:bg-[var(--brand-color-accent-on-light)]"
    : "border-[var(--brand-color-border-on-dark)] bg-osi-navy-700/60 text-white before:bg-[var(--brand-color-accent-on-dark)]";

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      reveal={false}
    >
      {data.title && (
        <h2 {...longTitle(data.title)} className="mb-8 text-center font-editorial text-section font-semibold text-balance">
          {data.title}
        </h2>
      )}
      <AnimatedGroup>
        <ul
          style={gridStyle}
          className="grid grid-cols-1 gap-4 sm:[grid-template-columns:repeat(var(--bc-sm),minmax(0,1fr))] lg:[grid-template-columns:repeat(var(--bc-lg),minmax(0,1fr))] xl:[grid-template-columns:repeat(var(--bc-xl),minmax(0,1fr))]"
        >
          {data.items.map((item, index) => (
            <li key={`${index}-${item.title}`} className="min-w-0">
              <AnimatedItem className="h-full">
                <div
                  className={`flex h-full flex-col items-center gap-4 border p-6 text-center before:h-[3px] before:w-8 before:flex-none before:content-[''] ${cell}`}
                >
                  <p className="font-body text-[clamp(1rem,1.1vw+0.6rem,1.1875rem)] font-normal leading-normal text-balance [overflow-wrap:anywhere]">
                    {item.title}
                  </p>
                  {item.body && (
                    <p className={`font-body text-sm leading-relaxed text-pretty [overflow-wrap:anywhere] ${light ? "text-osi-slate-300" : "text-osi-slate-200"}`}>
                      {item.body}
                    </p>
                  )}
                </div>
              </AnimatedItem>
            </li>
          ))}
        </ul>
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
    maxItems: 12,
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
  description: "1-12 ruled benefit cards (a sentence, optional detail) in a column count balanced so no card sits alone on a row — used by the product detail page template for a benefits/advantages list.",
  schema: benefitsCardsSchema,
  adminFields,
  defaults: { background: "navy", spacingTop: "md", spacingBottom: "md", title: "Benefits", items: [] },
  Render: BenefitsCardsRender,
});
