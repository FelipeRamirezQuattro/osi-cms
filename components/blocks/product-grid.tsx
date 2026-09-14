import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { CtaBreakoutBar } from "@/components/ui/cta-breakout-bar";
import { ProductGridClient } from "@/components/blocks/product-grid-client";
import { listProductCategories, listIndustries, listApplications } from "@/lib/data/taxonomy";
import { listPagesUnderSlug } from "@/lib/data/pages";
import { listProductsWithCategorySlug } from "@/lib/data/products";
import { pageHref } from "@/lib/routes";
import { safeHrefSchema } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

const schema = blockCommonSchema.extend({
  title: z.string().default("Products"),
  subtitle: z.string().optional(),
  ctaLabel: z.string().default("Connect with a specialist"),
  ctaHref: safeHrefSchema({ allowAnchor: true, label: "CTA link", defaultValue: "/contact" }),
});

type Data = z.infer<typeof schema>;

async function Render({ data }: { data: Data }) {
  const [products, categories, industries, applications, servicePages] = await Promise.all([
    listProductsWithCategorySlug(),
    listProductCategories(),
    listIndustries(),
    listApplications(),
    listPagesUnderSlug("services"),
  ]);
  const services = servicePages.map((page) => ({
    title: page.title,
    body: page.seo_description ?? undefined,
    href: pageHref(page.slug),
  }));

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom="lg"
      anchorId={data.anchorId}
      contentClassName="relative mx-auto max-w-6xl px-6 md:px-12"
      reveal={false}
    >
      <h2 className="sr-only">{data.title}</h2>
      {data.subtitle && <p className="mb-8 max-w-xl text-sm opacity-70">{data.subtitle}</p>}
      <ProductGridClient
        products={products}
        categories={categories}
        industries={industries}
        applications={applications}
        services={services}
      />
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
