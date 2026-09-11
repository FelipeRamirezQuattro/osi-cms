import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const specSchema = z.object({ label: z.string(), value: z.string(), unit: z.string().optional() });

export const specTableSchema = blockCommonSchema.extend({
  title: z.string().optional(),
  specs: z.array(specSchema).min(1),
});

export type SpecTableData = z.infer<typeof specTableSchema>;

export function SpecTableRender({ data }: { data: SpecTableData }) {
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
      <div className="divide-y divide-osi-sand-300/40 border-y border-osi-sand-300/40">
        {data.specs.map((spec) => (
          <div key={spec.label} className="flex justify-between py-3 text-sm">
            <span className="opacity-70">{spec.label}</span>
            <span className="font-display tracking-wide-display">
              {spec.value}
              {spec.unit ? ` ${spec.unit}` : ""}
            </span>
          </div>
        ))}
      </div>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "title", label: "Title", type: "text", optional: true },
  {
    key: "specs",
    label: "Specs",
    type: "array",
    minItems: 1,
    itemFields: [
      { key: "label", label: "Label", type: "text" },
      { key: "value", label: "Value", type: "text" },
      { key: "unit", label: "Unit", type: "text", optional: true },
    ],
  },
];

export const specTableBlock = defineBlock({
  type: "spec_table",
  label: "Spec table",
  category: "commerce",
  schema: specTableSchema,
  adminFields,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md", specs: [] },
  Render: SpecTableRender,
});
