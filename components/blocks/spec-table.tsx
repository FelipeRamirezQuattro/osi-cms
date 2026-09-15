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
      contentClassName="mx-auto max-w-4xl px-5 md:px-10"
    >
      {data.title && (
        <h2 className="mb-6 font-editorial text-section font-semibold text-balance">
          {data.title}
        </h2>
      )}
      <dl className="overflow-hidden rounded-[var(--site-radius-md)] border border-[var(--site-border)] bg-[var(--site-surface-raised)]">
        {data.specs.map((spec) => (
          <div key={spec.label} className="grid gap-1 border-b border-[var(--site-border)] px-5 py-4 text-sm last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6">
            <dt className="text-osi-slate-300">{spec.label}</dt>
            <dd className="font-semibold tabular-nums">
              {spec.value}
              {spec.unit ? ` ${spec.unit}` : ""}
            </dd>
          </div>
        ))}
      </dl>
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
  description: "Label/value/unit rows for technical specifications — used by the product detail page template for a spec sheet.",
  schema: specTableSchema,
  adminFields,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md", specs: [] },
  Render: SpecTableRender,
});
