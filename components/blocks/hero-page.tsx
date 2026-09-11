import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { DuotoneImage } from "@/components/ui/duotone-image";
import { GradientText } from "@/components/ui/gradient-text";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const schema = blockCommonSchema.extend({
  eyebrow: z.string().optional(),
  title: z.string(),
  imageUrl: z.string().optional(),
});

type Data = z.infer<typeof schema>;

function Render({ data }: { data: Data }) {
  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      reveal={false}
    >
      <div className="flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
        <div>
          {data.eyebrow && (
            <p className="mb-2 font-display text-small-label tracking-wide-label uppercase">
              {data.background === "cream" ? (
                // GradientText is navy-only — gold-700 is the single
                // WCAG-safe gold on cream, so there is no two-stop sweep
                // to run here (see gradient-text.tsx's comment). Full
                // opacity: gold-700 only clears WCAG AA on cream at 100%
                // — the old opacity-70 dim was safe against the previous
                // inherited navy/cream text color but isn't against gold.
                <span className="text-osi-gold-700">{data.eyebrow}</span>
              ) : (
                // Navy has huge contrast headroom, so the dimmed look
                // this eyebrow had before is preserved here instead.
                <GradientText className="opacity-70">{data.eyebrow}</GradientText>
              )}
            </p>
          )}
          <h1 className="font-display text-section tracking-tightest-display uppercase">
            {data.title}
          </h1>
        </div>
        {data.imageUrl && <DuotoneImage src={data.imageUrl} className="h-40 w-full md:w-80" />}
      </div>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "eyebrow", label: "Eyebrow", type: "text", optional: true },
  { key: "title", label: "Title", type: "text" },
  { key: "imageUrl", label: "Image", type: "image", optional: true },
];

export const heroPageBlock = defineBlock({
  type: "hero_page",
  label: "Page hero",
  category: "hero",
  schema,
  defaults: { background: "navy", spacingTop: "md", spacingBottom: "md", title: "" },
  Render,
  adminFields,
});
