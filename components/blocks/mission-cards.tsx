import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { ArrowButton } from "@/components/ui/arrow-button";
import { AnimatedGroup, AnimatedItem } from "@/components/ui/animated-group";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const cardSchema = z.object({
  title: z.string(),
  body: z.string().optional(),
  href: z.string().default("#"),
});

const schema = blockCommonSchema.extend({
  cards: z.array(cardSchema).min(1).max(3),
});

type Data = z.infer<typeof schema>;

function Render({ data }: { data: Data }) {
  const cols = data.cards.length === 1 ? "" : data.cards.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3";
  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      reveal={false}
    >
      <AnimatedGroup className={`grid grid-cols-1 gap-6 ${cols}`}>
        {data.cards.map((card) => (
          <AnimatedItem key={card.title} className="h-full">
            <div className="flex h-full flex-col gap-4">
              <h3 className="font-display text-card-label tracking-wide-display uppercase">
                → {card.title}
              </h3>
              {card.body && <p className="text-sm opacity-80">{card.body}</p>}
              <ArrowButton
                href={card.href}
                variant={data.background === "navy" ? "outline-light" : "outline-dark"}
                className="mt-auto self-start"
              >
                Learn more
              </ArrowButton>
            </div>
          </AnimatedItem>
        ))}
      </AnimatedGroup>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  {
    key: "cards",
    label: "Cards",
    type: "array",
    minItems: 1,
    maxItems: 3,
    itemFields: [
      { key: "title", label: "Title", type: "text" },
      { key: "body", label: "Body", type: "textarea", optional: true },
      { key: "href", label: "Link", type: "text" },
    ],
  },
];

export const missionCardsBlock = defineBlock({
  type: "mission_cards",
  label: "Mission cards",
  category: "content",
  schema,
  defaults: { background: "navy", spacingTop: "md", spacingBottom: "md", cards: [] },
  Render,
  adminFields,
});
