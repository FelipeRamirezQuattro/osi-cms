import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProductBySlug, listRelatedProducts } from "@/lib/data/products";
import { listResourcesForProduct } from "@/lib/data/resources";
import { getSiteSettings } from "@/lib/data/settings";
import { JsonLd, breadcrumbJsonLd, productJsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, resolveOgImage } from "@/lib/seo";
import { Section } from "@/components/ui/section";
import { ProductHeroRender } from "@/components/blocks/product-hero";
import { BenefitsCardsRender } from "@/components/blocks/benefits-cards";
import { StagesCarouselRender } from "@/components/blocks/stages-carousel";
import { HowItWorksRender } from "@/components/blocks/how-it-works";
import { SpecTableRender } from "@/components/blocks/spec-table";
import { RichTextRender, type RichTextData } from "@/components/blocks/rich-text";
import { VideoEmbedRender } from "@/components/blocks/video-embed-client";
import { LabelPlateGrid } from "@/components/blocks/label-plate-grid";
import { RecordProductView } from "@/components/blocks/record-product-view";
import { productHref } from "@/lib/routes";

// products.body is a Tiptap jsonb doc, same shape rich_text blocks store —
// an empty doc (no content array, or an empty one) means "never
// written", not "an intentional blank section", so it's treated the same
// as null.
function hasRichTextContent(value: unknown): value is { type: "doc"; content: unknown[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    "content" in value &&
    Array.isArray((value as { content: unknown }).content) &&
    (value as { content: unknown[] }).content.length > 0
  );
}

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

  const [relatedProducts, resources] = await Promise.all([
    listRelatedProducts(product.id),
    listResourcesForProduct(product.id),
  ]);

  const productUrl = absoluteUrl(productHref(category, slug));
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
      <VideoEmbedRender
        data={{
          background: "cream",
          spacingTop: "md",
          spacingBottom: "md",
          title: undefined,
          videoUrl: product.video_url ?? null,
          posterImageUrl: product.diagram_image_url ?? undefined,
        }}
      />
      <HowItWorksRender
        data={{
          background: "navy",
          spacingTop: "md",
          spacingBottom: "md",
          title: "How does it work?",
          body: product.summary ?? undefined,
          pdfUrl: product.brochure_pdf_url ?? null,
          model3dUrl: product.model_3d_url ?? null,
        }}
      />
      {hasRichTextContent(product.body) && (
        <RichTextRender
          data={{
            background: "cream",
            spacingTop: "md",
            spacingBottom: "md",
            content: product.body as RichTextData["content"],
          }}
        />
      )}
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
      {relatedProducts.length > 0 && (
        <Section background="navy" spacingTop="md" spacingBottom="md">
          <h2 className="font-display text-section tracking-tightest-display uppercase">Related products</h2>
          <div className="mt-8">
            {/*
              LabelPlateGrid directly, not RecommendationsClient: this is
              the admin's curated product_related list, not the
              algorithmic "based on your browsing history" recommendations
              block — RecommendationsClient re-filters to recently-viewed
              items whenever the visitor has viewed any of them, which
              would silently drop curated entries the visitor hasn't
              viewed yet (and swap post-hydration). LabelPlateGrid is
              itself a "use client" component (its own "one open per
              grid" state), so rendering it directly from this Server
              Component is the normal RSC pattern, no extra client
              wrapper needed.
            */}
            <LabelPlateGrid
              items={relatedProducts.map((p) => ({
                title: p.name,
                body: p.summary ?? undefined,
                href: p.categorySlug ? productHref(p.categorySlug, p.slug) : "/products",
              }))}
            />
          </div>
        </Section>
      )}
      {resources.length > 0 && (
        <Section background="cream" spacingTop="md" spacingBottom="md">
          <h2 className="font-display text-section tracking-tightest-display uppercase">Resources</h2>
          <ul className="mt-6 space-y-3">
            {resources.map((resource) => (
              <li key={resource.id}>
                <a
                  href={resource.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-display text-sm tracking-wide-display uppercase underline underline-offset-4 hover:opacity-80"
                >
                  {resource.title}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
