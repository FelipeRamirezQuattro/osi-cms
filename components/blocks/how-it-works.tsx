import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { optionalSafeHrefSchema } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

export const howItWorksSchema = blockCommonSchema.extend({
  title: z.string().default("How does it work?"),
  body: z.string().optional(),
  // Rendered as a real `<a href>` ("Download PDF") below, not just a
  // stored reference — same safety net as any other clickable link.
  pdfUrl: optionalSafeHrefSchema({ label: "PDF URL" }),
  // Mirrors pdfUrl exactly: a real "See this tool in 3D" link when set,
  // a disabled placeholder when not. Replaces the old `show3d: boolean`
  // field, which the product detail page always hardcoded to `true`
  // regardless of whether a real model existed — see CLAUDE.md's Task 7
  // notes.
  model3dUrl: optionalSafeHrefSchema({ label: "3D model URL" }),
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
            // WCAG 1.4.3 exempts genuinely inactive UI text from the
            // contrast requirement, but opacity-40 (3.73:1) still fails
            // Lighthouse's automated check, which can't see that
            // exemption — opacity-60 (6.86:1) reads just as "disabled"
            // and passes outright.
            <span
              aria-disabled
              className="rounded border border-current px-6 py-3 text-center font-display text-sm tracking-wide-display uppercase opacity-60"
            >
              Download PDF — pending client file
            </span>
          )}
          {data.model3dUrl ? (
            <a
              href={data.model3dUrl}
              className="rounded border border-current px-6 py-3 text-center font-display text-sm tracking-wide-display uppercase"
            >
              See this tool in 3D
            </a>
          ) : (
            // Same WCAG 1.4.3 reasoning as the PDF fallback above.
            <span
              aria-disabled
              className="rounded border border-current px-6 py-3 text-center font-display text-sm tracking-wide-display uppercase opacity-60"
            >
              See this tool in 3D — pending client file
            </span>
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
  { key: "model3dUrl", label: "3D model URL", type: "text", optional: true },
];

export const howItWorksBlock = defineBlock({
  type: "how_it_works",
  label: "How it works",
  category: "commerce",
  schema: howItWorksSchema,
  adminFields,
  defaults: {
    background: "navy",
    spacingTop: "md",
    spacingBottom: "md",
    title: "How does it work?",
    pdfUrl: null,
    model3dUrl: null,
  },
  Render: HowItWorksRender,
});
