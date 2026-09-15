import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const schema = blockCommonSchema.extend({
  title: z.string(),
  lede: z.string().optional(),
  align: z.enum(["left", "center"]).default("left"),
});

type Data = z.infer<typeof schema>;

function Render({ data }: { data: Data }) {
  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
    >
      <div className={data.align === "center" ? "text-center" : ""}>
        <h2 className="font-display-soft text-section font-semibold">
          {data.title}
        </h2>
        {data.lede && (
          <p className={`mt-4 max-w-2xl text-base ${data.align === "center" ? "mx-auto" : ""}`}>
            {data.lede}
          </p>
        )}
      </div>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "lede", label: "Lede", type: "textarea", optional: true },
  { key: "align", label: "Alignment", type: "select", options: ["left", "center"] },
];

export const sectionHeadingBlock = defineBlock({
  type: "section_heading",
  label: "Section heading",
  category: "content",
  description: "A standalone title plus optional lede paragraph to introduce a new section mid-page — not a page-top hero.",
  schema,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "sm", title: "", align: "left" },
  Render,
  adminFields,
});
