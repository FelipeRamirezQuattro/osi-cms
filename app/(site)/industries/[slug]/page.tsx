import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getIndustryBySlug, listProductsByIndustry } from "@/lib/data/taxonomy";
import { Section } from "@/components/ui/section";
import { LabelPlateGrid } from "@/components/blocks/label-plate-grid";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { absoluteUrl } from "@/lib/seo";
import { industryHref, productHref } from "@/lib/routes";
import { ArrowButton } from "@/components/ui/arrow-button";
import { EmptyState } from "@/components/ui/public-primitives";

// Taxonomy detail page (Task 8 item #5) — describes the industry and
// lists published products linked to it via product_industries. The
// mega menu's "Industries" nav item points to bare /products (see
// scripts/seed-navigation.ts's comment) rather than here — no /industries
// listing page exists, only this per-slug detail, which is reached from
// product_grid's "Industries" tab on /products (see
// components/blocks/product-grid-client.tsx).

export async function generateMetadata({
  params,
}: PageProps<"/industries/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const industry = await getIndustryBySlug(slug);
  if (!industry) return {};
  return {
    title: industry.name,
    description: industry.description ?? undefined,
  };
}

export default async function IndustryDetailPage({ params }: PageProps<"/industries/[slug]">) {
  const { slug } = await params;
  const industry = await getIndustryBySlug(slug);
  if (!industry) notFound();

  const products = await listProductsByIndustry(industry.id);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name: "Products", url: absoluteUrl("/products") },
          { name: industry.name, url: absoluteUrl(industryHref(industry.slug)) },
        ])}
      />
      <Section background="navy" spacingTop="lg" spacingBottom="md">
        <p className="mb-4 text-xs font-semibold tracking-[0.1em] text-osi-gold-400 uppercase">
          Industry
        </p>
        <h1 className="max-w-4xl font-editorial text-[clamp(2.25rem,6vw,4.5rem)] font-semibold leading-[1.05] text-balance [overflow-wrap:anywhere]">{industry.name}</h1>
        {industry.description && <p className="mt-5 max-w-[65ch] text-base leading-relaxed text-osi-slate-200">{industry.description}</p>}
      </Section>
      <Section background="cream" spacingTop="md" spacingBottom="lg">
        <h2 className="mb-8 font-editorial text-section font-semibold text-balance">
          Products for {industry.name}
        </h2>
        {products.length > 0 ? (
          <LabelPlateGrid
            items={products.map((p) => ({
              title: p.name,
              body: p.summary ?? undefined,
              href: p.categorySlug ? productHref(p.categorySlug, p.slug) : "/products",
            }))}
          />
        ) : (
          <EmptyState
            title="No products are linked yet"
            description="This industry does not have published products assigned to it yet. Explore the complete catalog instead."
            action={<ArrowButton href="/products" variant="outline-dark">Browse products</ArrowButton>}
          />
        )}
      </Section>
    </>
  );
}
