import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { optionalSafeHrefSchema } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";
import type { BlockRenderExtras } from "@/lib/blocks/types";
import { longTitle } from "@/lib/text/long-title";
import { externalLinkAttrs, isExternalHref } from "@/lib/routes";

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

const BUTTON =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-current/35 px-6 text-center text-sm font-semibold transition-[background-color,transform] duration-200 hover:bg-white/8 active:scale-[0.98]";
// WCAG 1.4.3 exempts genuinely inactive UI text from the contrast
// requirement, but opacity-40 (3.73:1) still fails Lighthouse's automated
// check, which can't see that exemption — opacity-70 reads just as "disabled".
const PLACEHOLDER =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-current/25 px-6 text-center text-sm font-medium opacity-70";

/**
 * On the public site only the actions that actually have a URL render (a
 * dead "pending client file" button read as a broken link on every
 * product), and the whole block disappears when there's nothing to show.
 * Staff preview keeps the placeholders so what's still missing is visible.
 */
export function HowItWorksRender({ data, isPreview = false }: { data: HowItWorksData } & BlockRenderExtras) {
  const hasBody = Boolean(data.body);
  if (!isPreview && !hasBody && !data.pdfUrl && !data.model3dUrl) return null;
  const showActions = isPreview || Boolean(data.pdfUrl) || Boolean(data.model3dUrl);

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
    >
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:items-start">
        {(data.title || data.body) && (
          <div>
            {data.title && (
              <h2 {...longTitle(data.title)} className="font-editorial text-section font-semibold text-balance">{data.title}</h2>
            )}
            {data.body && <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-osi-slate-200">{data.body}</p>}
          </div>
        )}
        {showActions && (
          <div className="flex flex-col gap-3">
            {data.pdfUrl ? (
              <a href={data.pdfUrl} className={BUTTON}>
                Download PDF
              </a>
            ) : (
              isPreview && (
                <span aria-disabled className={PLACEHOLDER}>
                  Download PDF — pending client file (staff preview only)
                </span>
              )
            )}
            {data.model3dUrl ? (
              <a href={data.model3dUrl} className={BUTTON} {...externalLinkAttrs(isExternalHref(data.model3dUrl))}>
                See this tool in 3D
              </a>
            ) : (
              isPreview && (
                <span aria-disabled className={PLACEHOLDER}>
                  See this tool in 3D — pending client file (staff preview only)
                </span>
              )
            )}
          </div>
        )}
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
  description: "Title/body plus PDF-download and 3D-model links (each shown only when a real URL is set; staff preview shows a placeholder) — used by the product detail page template.",
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
