import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { VideoEmbedRender } from "@/components/blocks/video-embed-client";

const schema = blockCommonSchema.extend({
  title: z.string().optional(),
  videoUrl: z.string(),
  posterImageUrl: z.string().optional(),
});

export type VideoEmbedData = z.infer<typeof schema>;

export const videoEmbedBlock = defineBlock({
  type: "video_embed",
  label: "Video embed",
  category: "media",
  schema,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md", videoUrl: "" },
  Render: VideoEmbedRender,
});
