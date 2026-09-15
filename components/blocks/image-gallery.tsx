import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { ImageGalleryClient } from "@/components/blocks/image-gallery-client";
import { safeHrefSchema } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

// `url` is picked via the media library (adminFields marks it "image").
// The safe-href guard also prevents an unsafe source from reaching the
// thumbnail or fullscreen viewer.
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
        <h2 className="mb-6 font-editorial text-section font-semibold text-balance">
          {data.title}
        </h2>
      )}
      <ImageGalleryClient images={data.images} />
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
  description: "Grid of images with an accessible fullscreen viewer — use for a multi-photo gallery (e.g. Machine Shop); for a single feature image use the Image block instead.",
  schema,
  adminFields,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md", images: [] },
  Render,
});
