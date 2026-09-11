import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { AnimatedGroup, AnimatedItem } from "@/components/ui/animated-group";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const columnSchema = z.object({
  heading: z.string().optional(),
  links: z.array(z.object({ label: z.string(), href: z.string().default("#") })),
});

const schema = blockCommonSchema.extend({
  columns: z.array(columnSchema).min(1).max(4),
});

type Data = z.infer<typeof schema>;

const COLS_CLASS: Record<number, string> = {
  1: "",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

function Render({ data }: { data: Data }) {
  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      reveal={false}
    >
      <AnimatedGroup className={`grid grid-cols-1 gap-8 ${COLS_CLASS[data.columns.length] ?? ""}`}>
        {data.columns.map((col, i) => (
          <AnimatedItem key={i}>
            {col.heading && (
              <h3 className="mb-3 font-display text-small-label tracking-wide-label uppercase opacity-70">
                {col.heading}
              </h3>
            )}
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm hover:underline">
                    → {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </AnimatedItem>
        ))}
      </AnimatedGroup>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  {
    key: "columns",
    label: "Columns",
    type: "array",
    minItems: 1,
    maxItems: 4,
    itemFields: [
      { key: "heading", label: "Heading", type: "text", optional: true },
      {
        key: "links",
        label: "Links",
        type: "array",
        itemFields: [
          { key: "label", label: "Label", type: "text" },
          { key: "href", label: "Link", type: "text" },
        ],
      },
    ],
  },
];

export const linkColumnsBlock = defineBlock({
  type: "link_columns",
  label: "Link columns",
  category: "layout",
  schema,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md", columns: [] },
  Render,
  adminFields,
});
