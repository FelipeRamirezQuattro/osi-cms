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
      <div className="grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)] md:gap-12">
        <div className="max-w-3xl">
          {data.eyebrow && (
            <p className="mb-2 font-display text-small-label tracking-wide-label uppercase">
              {data.background === "navy" ? (
                // Navy is the ONLY background GradientText is safe on
                // (see gradient-text.tsx) — "transparent" renders
                // `bg-transparent` and lets the cream page body through,
                // so it takes the solid fallback too. No opacity dim:
                // compositing the gold-500 stop at 70% onto navy drops
                // this 12px label to ~3.9:1, under the 4.5:1 AA floor.
                <GradientText>{data.eyebrow}</GradientText>
              ) : (
                // gold-700 is the single WCAG-safe gold on cream, so
                // there is no two-stop sweep to run here. Full opacity:
                // gold-700 only clears AA on cream at 100%.
                <span className="text-osi-gold-700">{data.eyebrow}</span>
              )}
            </p>
          )}
          <h1 className="font-editorial text-[clamp(2rem,5vw,4rem)] font-semibold leading-[1.06] text-balance [overflow-wrap:anywhere]">
            {data.title}
          </h1>
        </div>
        {data.imageUrl && (
          <DuotoneImage
            src={data.imageUrl}
            className="aspect-video w-full rounded-[var(--site-radius-lg)]"
            sizes="(min-width: 768px) 50vw, 100vw"
            loading="eager"
          />
        )}
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
  description: "Compact title-and-eyebrow banner for an interior page (not a full-bleed photo hero) — use at the top of most migrated or new interior pages.",
  schema,
  defaults: { background: "navy", spacingTop: "md", spacingBottom: "md", title: "" },
  Render,
  adminFields,
});
