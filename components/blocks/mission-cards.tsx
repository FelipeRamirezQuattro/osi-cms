import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { ArrowButton } from "@/components/ui/arrow-button";

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
    >
      <div className={`grid grid-cols-1 gap-6 ${cols}`}>
        {data.cards.map((card) => (
          <div key={card.title} className="flex flex-col gap-4">
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
        ))}
      </div>
    </Section>
  );
}

export const missionCardsBlock = defineBlock({
  type: "mission_cards",
  label: "Mission cards",
  category: "content",
  schema,
  defaults: { background: "navy", spacingTop: "md", spacingBottom: "md", cards: [] },
  Render,
});
