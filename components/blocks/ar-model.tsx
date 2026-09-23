import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { requiredString } from "@/lib/validation/common";
import { ArModelRender } from "@/components/blocks/ar-model-client";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const schema = blockCommonSchema.extend({
  title: z.string().optional(),
  glbUrl: requiredString("3D model (.glb)"),
  usdzUrl: requiredString("iOS AR model (.usdz)"),
  posterUrl: z.string().optional(),
  alt: requiredString("Alt text"),
  caption: z.string().optional(),
});

export type ArModelData = z.infer<typeof schema>;

const adminFields: FieldSpec[] = [
  { key: "title", label: "Title", type: "text", optional: true },
  { key: "glbUrl", label: "3D model (.glb)", type: "image", accept: "model" },
  { key: "usdzUrl", label: "iOS AR model (.usdz)", type: "image", accept: "model" },
  { key: "posterUrl", label: "Poster image", type: "image", optional: true },
  { key: "alt", label: "Alt text", type: "text" },
  { key: "caption", label: "Caption", type: "text", optional: true },
];

export const arModelBlock = defineBlock({
  type: "ar_model",
  label: "AR model",
  category: "media",
  description:
    "A 3D model viewer with automatic AR launch (iOS Quick Look / Android Scene Viewer) and a QR code to open it on a phone — requires both a .glb and a .usdz exported from Blender.",
  schema,
  adminFields,
  defaults: {
    background: "cream",
    spacingTop: "md",
    spacingBottom: "md",
    glbUrl: "",
    usdzUrl: "",
    alt: "",
  },
  Render: ArModelRender,
});
