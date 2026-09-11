import Image from "next/image";
import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";

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
      <div className="flex flex-wrap items-center justify-center gap-10 opacity-80 grayscale">
        {data.logos.map((logo) =>
          logo.imageUrl ? (
            <Image key={logo.name} src={logo.imageUrl} alt={logo.name} width={120} height={48} />
          ) : (
            <span key={logo.name} className="font-display text-sm tracking-wide-display uppercase">
              {logo.name}
            </span>
          ),
        )}
      </div>
    </Section>
  );
}

export const logoStripBlock = defineBlock({
  type: "logo_strip",
  label: "Logo strip",
  category: "layout",
  schema,
  defaults: { background: "cream", spacingTop: "sm", spacingBottom: "sm", logos: [] },
  Render,
});
