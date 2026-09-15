import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

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
      contentClassName="mx-auto max-w-3xl px-5 md:px-10"
    >
      {data.title && (
        <h2 className="mb-6 font-editorial text-section font-semibold text-balance">
          {data.title}
        </h2>
      )}
      <div className="space-y-3">
        {data.items.map((item) => (
          <details key={item.title} className="group rounded-[var(--site-radius-md)] border border-current/15 bg-white/30 px-5">
            <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-5 font-editorial text-base font-semibold">
              {item.title}
              <span aria-hidden className="transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="pb-5 text-sm leading-relaxed opacity-80">{item.body}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "title", label: "Title", type: "text", optional: true },
  {
    key: "items",
    label: "Items",
    type: "array",
    minItems: 1,
    itemFields: [
      { key: "title", label: "Title", type: "text" },
      { key: "body", label: "Body", type: "textarea" },
    ],
  },
];

export const accordionBlock = defineBlock({
  type: "accordion",
  label: "Accordion",
  category: "content",
  description: "Native <details>/<summary> expand-collapse list of title/body items — use for FAQs or any content better collapsed by default.",
  schema,
  adminFields,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md", items: [] },
  Render,
});
