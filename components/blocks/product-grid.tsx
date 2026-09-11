import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { CtaBreakoutBar } from "@/components/ui/cta-breakout-bar";
import { ProductGridClient, type ProductWithCategorySlug } from "@/components/blocks/product-grid-client";
import { listProductCategories, listIndustries, listApplications, listServices } from "@/lib/data/taxonomy";
import type { FieldSpec } from "@/lib/blocks/admin-fields";
import { createServerDbClient } from "@/lib/db/client";

const schema = blockCommonSchema.extend({
  title: z.string().default("Products"),
  subtitle: z.string().optional(),
  ctaLabel: z.string().default("Connect with a specialist"),
  ctaHref: z.string().default("/contact"),
});

type Data = z.infer<typeof schema>;

async function getProductsWithCategorySlug(): Promise<ProductWithCategorySlug[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("products")
    .select("*, product_categories(slug)")
    .eq("status", "published")
    .order("position", { ascending: true });
  if (error) throw error;
  return (data ?? []).map(({ product_categories, ...product }) => ({
    ...product,
    categorySlug: (product_categories as { slug: string } | null)?.slug ?? null,
  }));
}

async function Render({ data }: { data: Data }) {
  const [products, categories, industries, applications, services] = await Promise.all([
    getProductsWithCategorySlug(),
    listProductCategories(),
    listIndustries(),
    listApplications(),
    listServices(),
  ]);

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom="lg"
      anchorId={data.anchorId}
      contentClassName="relative mx-auto max-w-6xl px-6 md:px-12"
    >
      <h2 className="font-display text-section tracking-tightest-display uppercase">
        {data.title}
      </h2>
      {data.subtitle && <p className="mt-2 mb-8 max-w-xl text-sm opacity-70">{data.subtitle}</p>}
      <div className="mt-8">
        <ProductGridClient
          products={products}
          categories={categories}
          industries={industries}
          applications={applications}
          services={services}
        />
      </div>
      <CtaBreakoutBar href={data.ctaHref}>{data.ctaLabel}</CtaBreakoutBar>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "title", label: "Title", type: "text" },
  { key: "subtitle", label: "Subtitle", type: "text", optional: true },
  { key: "ctaLabel", label: "CTA label", type: "text" },
  { key: "ctaHref", label: "CTA link", type: "text" },
];

export const productGridBlock = defineBlock({
  type: "product_grid",
  label: "Product grid",
  category: "commerce",
  schema,
  adminFields,
  defaults: {
    background: "cream",
    spacingTop: "md",
    spacingBottom: "lg",
    title: "Products",
    ctaLabel: "Connect with a specialist",
    ctaHref: "/contact",
  },
  Render,
});
