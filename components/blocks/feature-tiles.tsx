import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { ArrowButton } from "@/components/ui/arrow-button";
import { LabelPlateGrid } from "@/components/blocks/label-plate-grid";

const tileSchema = z.object({
  title: z.string(),
  body: z.string().optional(),
  href: z.string().default("#"),
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
    >
      {data.title && (
        <h2 className="mb-8 font-display text-section tracking-tightest-display uppercase">
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

export const featureTilesBlock = defineBlock({
  type: "feature_tiles",
  label: "Feature tiles",
  category: "content",
  schema,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md", tiles: [], showLoadMore: false },
  Render,
});
