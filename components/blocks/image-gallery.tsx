import Image from "next/image";
import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { AnimatedGroup, AnimatedItem } from "@/components/ui/animated-group";
import { safeHrefSchema } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

// `url` is picked via the media library (adminFields marks it "image"),
// so it's a media asset in practice — but it also doubles as a real
// `<a href target="_blank">` below (open full-size), so it gets the same
// link safety net rather than being treated as a pure <img src>.
const imageSchema = z.object({ url: safeHrefSchema({ label: "Image" }), alt: z.string().optional() });

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
      reveal={false}
    >
      {data.title && (
        <h2 className="mb-6 font-display text-section tracking-tightest-display uppercase">
          {data.title}
        </h2>
      )}
      <AnimatedGroup className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {data.images.map((image, i) => (
          // Opens full-size in a new tab — a real lightbox is deferred
          // until a page actually needs this block (Machine Shop).
          <AnimatedItem key={i}>
            <a
              href={image.url}
              target="_blank"
              rel="noreferrer"
              className="relative block aspect-square transition-shadow duration-300 hover:shadow-[0_0_0_1px_var(--color-osi-steel-500),0_8px_32px_color-mix(in_srgb,var(--color-osi-steel-500)_25%,transparent),0_0_60px_color-mix(in_srgb,var(--color-osi-steel-500)_10%,transparent)]"
            >
              <Image src={image.url} alt={image.alt ?? ""} fill className="object-cover" />
            </a>
          </AnimatedItem>
        ))}
      </AnimatedGroup>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "title", label: "Title", type: "text", optional: true },
  {
    key: "images",
    label: "Images",
    type: "array",
    minItems: 1,
    itemFields: [
      { key: "url", label: "Image", type: "image" },
      { key: "alt", label: "Alt text", type: "text", optional: true },
    ],
  },
];

export const imageGalleryBlock = defineBlock({
  type: "image_gallery",
  label: "Image gallery",
  category: "media",
  description: "Grid of images that each open full-size in a new tab — use for a multi-photo gallery (e.g. Machine Shop); for a single feature image use the Image block instead.",
  schema,
  adminFields,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md", images: [] },
  Render,
});
