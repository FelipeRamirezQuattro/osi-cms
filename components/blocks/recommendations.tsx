import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { RecommendationsClient } from "@/components/blocks/recommendations-client";
import { listProductsWithCategorySlug } from "@/lib/data/products";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const schema = blockCommonSchema.extend({
  title: z.string().default("Recommendations"),
  subtitle: z.string().default("Based on your browsing history"),
  limit: z.number().min(1).max(8).default(4),
});

type Data = z.infer<typeof schema>;

async function Render({ data }: { data: Data }) {
  const products = await listProductsWithCategorySlug();
  if (products.length === 0) return null;

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      reveal={false}
    >
      <h2 className="font-display text-section tracking-tightest-display uppercase">
        {data.title}
      </h2>
      <p className="mt-1 mb-8 text-xs text-osi-slate-400 uppercase">{data.subtitle}</p>
      <RecommendationsClient
        fallback={products.map((p) => ({
          slug: p.slug,
          name: p.name,
          summary: p.summary,
          categorySlug: p.categorySlug,
        }))}
        limit={data.limit}
      />
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "subtitle", label: "Subtitle", type: "text" },
  { key: "limit", label: "Max items", type: "number" },
];

export const recommendationsBlock = defineBlock({
  type: "recommendations",
  label: "Recommendations",
  category: "commerce",
  schema,
  adminFields,
  defaults: {
    background: "navy",
    spacingTop: "md",
    spacingBottom: "md",
    title: "Recommendations",
    subtitle: "Based on your browsing history",
    limit: 4,
  },
  Render,
});
