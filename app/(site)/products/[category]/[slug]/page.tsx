import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug } from "@/lib/data/products";
import { getSiteSettings } from "@/lib/data/settings";
import { JsonLd, breadcrumbJsonLd, productJsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, resolveOgImage } from "@/lib/seo";
import { ProductHeroRender } from "@/components/blocks/product-hero";
import { BenefitsCardsRender } from "@/components/blocks/benefits-cards";
import { StagesCarouselRender } from "@/components/blocks/stages-carousel";
import { HowItWorksRender } from "@/components/blocks/how-it-works";
import { SpecTableRender } from "@/components/blocks/spec-table";
import { RecordProductView } from "@/components/blocks/record-product-view";

// Product detail renders directly from products + its child tables
// rather than through page_blocks/BlockRenderer — its structure is
// fixed/relational (benefits, stages, specs), not freeform CMS content.
// See docs/DECISIONS.md.

export async function generateMetadata({
  params,
}: PageProps<"/products/[category]/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [product, settings] = await Promise.all([getProductBySlug(slug), getSiteSettings()]);
  if (!product) return {};
  const ogImage = resolveOgImage(product.hero_image_url ?? product.diagram_image_url, settings.default_og_image);
  return {
    title: product.seo_title ?? product.name,
    description: product.seo_description ?? product.summary ?? undefined,
    openGraph: ogImage ? { images: [ogImage] } : undefined,
  };
}

export default async function ProductDetailPage({
  params,
}: PageProps<"/products/[category]/[slug]">) {
  const { category, slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.categorySlug !== category) notFound();

  const productUrl = absoluteUrl(`/products/${category}/${slug}`);
  const productImage = product.hero_image_url ?? product.diagram_image_url;

  return (
    <>
      <JsonLd
        data={productJsonLd({
          name: product.name,
          description: product.summary,
          url: productUrl,
          image: productImage ? resolveOgImage(productImage, null) : undefined,
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name: "Products", url: absoluteUrl("/products") },
          { name: product.name, url: productUrl },
        ])}
      />
      <RecordProductView slug={product.slug} />
      <ProductHeroRender
        data={{
          background: "navy",
          spacingTop: "md",
          spacingBottom: "lg",
          eyebrow: product.eyebrow ?? undefined,
          title: product.name,
          paragraphs: product.summary ? [product.summary] : [],
          diagramImageUrl: product.diagram_image_url ?? undefined,
          ctaLabel: "Find a distributor",
          ctaHref: "/contact",
        }}
      />
      {product.product_benefits.length > 0 && (
        <BenefitsCardsRender
          data={{
            background: "navy",
            spacingTop: "md",
            spacingBottom: "md",
            title: "Benefits",
            items: product.product_benefits.map((b) => ({ title: b.title, body: b.body ?? undefined })),
          }}
        />
      )}
      {product.product_stages.length > 0 && (
        <StagesCarouselRender
          data={{
            background: "cream",
            spacingTop: "md",
            spacingBottom: "md",
            title: "Stages",
            stages: product.product_stages.map((s) => ({
              title: s.title,
              body: s.body ?? undefined,
              imageUrl: s.image_url ?? undefined,
            })),
          }}
        />
      )}
      <HowItWorksRender
        data={{
          background: "navy",
          spacingTop: "md",
          spacingBottom: "md",
          title: "How does it work?",
          body: product.summary ?? undefined,
          pdfUrl: product.brochure_pdf_url ?? undefined,
          show3d: true,
        }}
      />
      {product.product_specs.length > 0 && (
        <SpecTableRender
          data={{
            background: "cream",
            spacingTop: "md",
            spacingBottom: "md",
            title: "Specifications",
            specs: product.product_specs.map((s) => ({
              label: s.label,
              value: s.value,
              unit: s.unit ?? undefined,
            })),
          }}
        />
      )}
    </>
  );
}
