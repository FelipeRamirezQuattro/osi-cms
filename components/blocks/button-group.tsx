import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { ArrowButton } from "@/components/ui/arrow-button";
import { CTA_FIELDS } from "@/lib/blocks/admin-fields";
import { requiredString, safeHrefSchema } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const buttonSchema = z.object({
  label: requiredString("Button label"),
  href: safeHrefSchema({ allowAnchor: true, label: "Button link" }),
});

const ALIGNMENTS = ["left", "center", "right"] as const;

// The lightweight alternative to cta_band (CLAUDE.md's Task 9 ruling) —
// 1-3 buttons with no headline/breakout-bar treatment, for a page that
// just needs a couple of CTAs without the full banner.
const schema = blockCommonSchema.extend({
  buttons: z.array(buttonSchema).min(1).max(3),
  alignment: z.enum(ALIGNMENTS).default("center"),
});

type Data = z.infer<typeof schema>;

const ALIGNMENT_CLASS: Record<(typeof ALIGNMENTS)[number], string> = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
};

function Render({ data }: { data: Data }) {
  // First button reads as primary (solid-gold, contrast-safe on either
  // background); the rest use the same background-aware outline variant
  // mission-cards.tsx/global-map.tsx already establish — ArrowButton's
  // own variants handle contrast, so no separate gold/slate text-token
  // branch is needed here (CLAUDE.md's Task 9 ruling #9).
  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      reveal={false}
    >
      <div className={`flex flex-wrap gap-4 ${ALIGNMENT_CLASS[data.alignment]}`}>
        {data.buttons.map((button, i) => (
          <ArrowButton
            key={button.label}
            href={button.href}
            variant={i === 0 ? "solid-gold" : data.background === "navy" ? "outline-light" : "outline-dark"}
          >
            {button.label}
          </ArrowButton>
        ))}
      </div>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "buttons", label: "Buttons", type: "array", minItems: 1, maxItems: 3, itemFields: CTA_FIELDS },
  { key: "alignment", label: "Alignment", type: "select", options: [...ALIGNMENTS] },
];

export const buttonGroupBlock = defineBlock({
  type: "button_group",
  label: "Button group",
  category: "layout",
  description:
    "1-3 standalone CTA buttons with no headline — the lightweight alternative to CTA band when a full breakout bar isn't warranted.",
  schema,
  adminFields,
  defaults: { background: "cream", spacingTop: "sm", spacingBottom: "sm", buttons: [], alignment: "center" },
  Render,
});
