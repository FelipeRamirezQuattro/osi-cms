import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

export const howItWorksSchema = blockCommonSchema.extend({
  title: z.string().default("How does it work?"),
  body: z.string().optional(),
  pdfUrl: z.string().optional(),
  show3d: z.boolean().default(true),
});

export type HowItWorksData = z.infer<typeof howItWorksSchema>;

export function HowItWorksRender({ data }: { data: HowItWorksData }) {
  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
    >
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start">
        <div>
          <h2 className="font-display text-section tracking-tightest-display uppercase">
            {data.title}
          </h2>
          {data.body && <p className="mt-4 max-w-md text-sm opacity-80">{data.body}</p>}
        </div>
        <div className="flex flex-col gap-3">
          {data.pdfUrl ? (
            <a
              href={data.pdfUrl}
              className="rounded border border-current px-6 py-3 text-center font-display text-sm tracking-wide-display uppercase"
            >
              Download PDF
            </a>
          ) : (
            <span className="rounded border border-current px-6 py-3 text-center font-display text-sm tracking-wide-display uppercase opacity-40">
              Download PDF — pending client file
            </span>
          )}
          {data.show3d && (
            // Out of scope per master prompt §3 — placeholder link only.
            <a
              href="#"
              className="rounded border border-current px-6 py-3 text-center font-display text-sm tracking-wide-display uppercase"
            >
              See this tool in 3D
            </a>
          )}
        </div>
      </div>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "body", label: "Body", type: "textarea", optional: true },
  { key: "pdfUrl", label: "PDF URL", type: "text", optional: true },
  { key: "show3d", label: "Show “See this tool in 3D”", type: "boolean" },
];

export const howItWorksBlock = defineBlock({
  type: "how_it_works",
  label: "How it works",
  category: "commerce",
  schema: howItWorksSchema,
  adminFields,
  defaults: { background: "navy", spacingTop: "md", spacingBottom: "md", title: "How does it work?", show3d: true },
  Render: HowItWorksRender,
});
