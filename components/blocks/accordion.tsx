import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";

const itemSchema = z.object({ title: z.string(), body: z.string() });

const schema = blockCommonSchema.extend({
  title: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

type Data = z.infer<typeof schema>;

function Render({ data }: { data: Data }) {
  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      contentClassName="mx-auto max-w-3xl px-6 md:px-12"
    >
      {data.title && (
        <h2 className="mb-6 font-display text-section tracking-tightest-display uppercase">
          {data.title}
        </h2>
      )}
      <div className="divide-y divide-osi-sand-300/40">
        {data.items.map((item) => (
          <details key={item.title} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between font-display text-sm tracking-wide-display uppercase">
              {item.title}
              <span aria-hidden className="transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm opacity-80">{item.body}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

export const accordionBlock = defineBlock({
  type: "accordion",
  label: "Accordion",
  category: "content",
  schema,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md", items: [] },
  Render,
});
