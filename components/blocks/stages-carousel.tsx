import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { StagesCarouselRender } from "@/components/blocks/stages-carousel-client";

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

export const stagesCarouselBlock = defineBlock({
  type: "stages_carousel",
  label: "Stages carousel",
  category: "commerce",
  schema: stagesCarouselSchema,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md", title: "Stages", stages: [] },
  Render: StagesCarouselRender,
});
