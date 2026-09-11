import Image from "next/image";
import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";

const imageSchema = z.object({ url: z.string(), alt: z.string().optional() });

const schema = blockCommonSchema.extend({
  title: z.string().optional(),
  images: z.array(imageSchema).min(1),
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
        <h2 className="mb-6 font-display text-section tracking-tightest-display uppercase">
          {data.title}
        </h2>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {data.images.map((image, i) => (
          // Opens full-size in a new tab — a real lightbox is deferred
          // until a page actually needs this block (Machine Shop).
          <a key={i} href={image.url} target="_blank" rel="noreferrer" className="relative block aspect-square">
            <Image src={image.url} alt={image.alt ?? ""} fill className="object-cover" />
          </a>
        ))}
      </div>
    </Section>
  );
}

export const imageGalleryBlock = defineBlock({
  type: "image_gallery",
  label: "Image gallery",
  category: "media",
  schema,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md", images: [] },
  Render,
});
