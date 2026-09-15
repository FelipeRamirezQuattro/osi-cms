import Image from "next/image";
import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { MarqueeStrip } from "@/components/ui/marquee-strip";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const logoSchema = z.object({ name: z.string(), imageUrl: z.string().optional() });

const schema = blockCommonSchema.extend({
  title: z.string().optional(),
  logos: z.array(logoSchema).min(1),
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
      {data.title && (
        <p className="mb-6 text-center text-xs tracking-wide-label uppercase opacity-60">
          {data.title}
        </p>
      )}
      <MarqueeStrip className="opacity-80 grayscale">
        {data.logos.map((logo) =>
          logo.imageUrl ? (
            <Image
              key={logo.name}
              src={logo.imageUrl}
              alt={logo.name}
              width={120}
              height={48}
              className="shrink-0"
            />
          ) : (
            <span
              key={logo.name}
              className="shrink-0 font-display text-sm tracking-wide-display uppercase"
            >
              {logo.name}
            </span>
          ),
        )}
      </MarqueeStrip>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "title", label: "Title", type: "text", optional: true },
  {
    key: "logos",
    label: "Logos",
    type: "array",
    minItems: 1,
    itemFields: [
      { key: "name", label: "Name", type: "text" },
      { key: "imageUrl", label: "Image", type: "image", optional: true },
    ],
  },
];

export const logoStripBlock = defineBlock({
  type: "logo_strip",
  label: "Logo strip",
  category: "layout",
  description: "Grayscale marquee of partner/client logos (falls back to a name label per item with no image) — use for a trust-bar/partners strip.",
  schema,
  adminFields,
  defaults: { background: "cream", spacingTop: "sm", spacingBottom: "sm", logos: [] },
  Render,
});
