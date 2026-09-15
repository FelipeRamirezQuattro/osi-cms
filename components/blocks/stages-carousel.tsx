import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { StagesCarouselRender } from "@/components/blocks/stages-carousel-client";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const stageSchema = z.object({
  title: z.string(),
  body: z.string().optional(),
  imageUrl: z.string().optional(),
});

export const stagesCarouselSchema = blockCommonSchema.extend({
  title: z.string().default("Stages"),
  stages: z.array(stageSchema).min(1),
});

export type StagesCarouselData = z.infer<typeof stagesCarouselSchema>;

export { StagesCarouselRender };

const adminFields: FieldSpec[] = [
  { key: "title", label: "Title", type: "text" },
  {
    key: "stages",
    label: "Stages",
    type: "array",
    minItems: 1,
    itemFields: [
      { key: "title", label: "Title", type: "text" },
      { key: "body", label: "Body", type: "textarea", optional: true },
      { key: "imageUrl", label: "Image", type: "image", optional: true },
    ],
  },
];

export const stagesCarouselBlock = defineBlock({
  type: "stages_carousel",
  label: "Stages carousel",
  category: "commerce",
  description: "Swipeable/paged carousel of process stages (title, body, image) — used by the product detail page template for step-by-step process content.",
  schema: stagesCarouselSchema,
  adminFields,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md", title: "Stages", stages: [] },
  Render: StagesCarouselRender,
});
