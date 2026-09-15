import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { ArrowButton } from "@/components/ui/arrow-button";
import { LabelPlateGrid } from "@/components/blocks/label-plate-grid";
import { requiredString, safeHrefSchema } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const tileSchema = z.object({
  title: requiredString("Tile title"),
  body: z.string().optional(),
  href: safeHrefSchema({ allowAnchor: true, label: "Tile link" }),
  imageUrl: z.string().optional(),
});

const schema = blockCommonSchema.extend({
  title: z.string().optional(),
  tiles: z.array(tileSchema).min(1).max(8),
  showLoadMore: z.boolean().default(false),
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
        <h2 className="mb-8 font-editorial text-section font-semibold text-balance">
          {data.title}
        </h2>
      )}
      <LabelPlateGrid items={data.tiles} columns={data.tiles.length >= 4 ? 4 : 3} />
      {data.showLoadMore && (
        <div className="mt-8 flex justify-center">
          <ArrowButton variant="outline-dark">Load more</ArrowButton>
        </div>
      )}
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "title", label: "Title", type: "text", optional: true },
  {
    key: "tiles",
    label: "Tiles",
    type: "array",
    minItems: 1,
    maxItems: 8,
    itemFields: [
      { key: "title", label: "Title", type: "text" },
      { key: "body", label: "Body", type: "textarea", optional: true },
      { key: "href", label: "Link", type: "text" },
      { key: "imageUrl", label: "Image", type: "image", optional: true },
    ],
  },
  { key: "showLoadMore", label: "Show “Load more”", type: "boolean" },
];

export const featureTilesBlock = defineBlock({
  type: "feature_tiles",
  label: "Feature tiles",
  category: "content",
  description: "1-8 label-plate tiles (image, title, body, link) in a grid — use for a set of feature/topic links, e.g. a services or capabilities overview.",
  schema,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md", tiles: [], showLoadMore: false },
  Render,
  adminFields,
});
