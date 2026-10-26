import { Section } from "@/components/ui/section";
import { BlockScope } from "@/components/blocks/block-scope";
import { JsonLd, breadcrumbJsonLd, productJsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, resolveOgImage } from "@/lib/seo";
import { ProductHeroRender } from "@/components/blocks/product-hero";
import { BenefitsCardsRender } from "@/components/blocks/benefits-cards";
import { StagesCarouselRender } from "@/components/blocks/stages-carousel";
import { HowItWorksRender } from "@/components/blocks/how-it-works";
import { SpecTableRender } from "@/components/blocks/spec-table";
import { RichTextRender, type RichTextData } from "@/components/blocks/rich-text";
import { VideoEmbedRender } from "@/components/blocks/video-embed-client";
import { LabelPlateGrid } from "@/components/blocks/label-plate-grid";
import { RecordProductView } from "@/components/blocks/record-product-view";
import { BlockRenderer } from "@/components/blocks/block-renderer";
import { productHref } from "@/lib/routes";
import {
  LINKED_SECTIONS,
  isLinkedSectionType,
  linkedSectionDataSchema,
  resolveLayout,
  type LayoutRow,
  type LinkedSectionType,
} from "@/lib/products/layout";
import type { ProductDetail } from "@/lib/data/products";
import type { Tables } from "@/lib/db/database.types";

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

/** The summary is stored as paragraphs separated by a blank line; render each as its own paragraph. */
export function splitParagraphs(summary: string | null | undefined): string[] {
  return (summary ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function sectionBackground(row: LayoutRow, type: LinkedSectionType): "navy" | "cream" {
  const parsed = linkedSectionDataSchema.safeParse(row.data);
  return parsed.success && parsed.data.background ? parsed.data.background : LINKED_SECTIONS[type].defaultBackground;
}

/** One entry of the ordered layout: a linked product section, or an ordinary block through the registry. */
function LayoutRowView({ row, product, isPreview }: { row: LayoutRow; product: ProductDetail; isPreview: boolean }) {
  if (!isLinkedSectionType(row.type)) {
    return <BlockRenderer blocks={[{ id: row.id ?? row.type, type: row.type, data: row.data as never }]} isPreview={isPreview} />;
  }
  const parsed = linkedSectionDataSchema.safeParse(row.data);
  const title = (parsed.success ? parsed.data.title : undefined) ?? "";
  const background = sectionBackground(row, row.type);
  const common = { background, spacingTop: "md", spacingBottom: "md" } as const;

  switch (row.type) {
    case "product_benefits":
      if (product.product_benefits.length === 0) return null;
      return (
        <BlockScope type="benefits_cards" background={background}>
          <BenefitsCardsRender
            data={{ ...common, title, items: product.product_benefits.map((b) => ({ title: b.title, body: b.body ?? undefined })) }}
          />
        </BlockScope>
      );
    case "product_stages":
      if (product.product_stages.length === 0) return null;
      return (
        <BlockScope type="stages_carousel" background={background}>
          <StagesCarouselRender
            data={{
              ...common,
              title,
              stages: product.product_stages.map((s) => ({ title: s.title, body: s.body ?? undefined, imageUrl: s.image_url ?? undefined })),
            }}
          />
        </BlockScope>
      );
    case "product_video":
      return (
        <BlockScope type="video_embed" background={background}>
          <VideoEmbedRender
            data={{
              ...common,
              title: title || undefined,
              videoUrl: product.video_url ?? null,
              posterImageUrl: (parsed.success && parsed.data.posterImageUrl) || product.diagram_image_url || undefined,
            }}
          />
        </BlockScope>
      );
    case "product_downloads":
      return (
        <BlockScope type="how_it_works" background={background}>
          <HowItWorksRender
            data={{ ...common, title, pdfUrl: product.brochure_pdf_url ?? null, model3dUrl: product.model_3d_url ?? null }}
            isPreview={isPreview}
          />
        </BlockScope>
      );
    case "product_body": {
      if (!hasRichTextContent(product.body)) return null;
      const heading = title
        ? [{ type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: title }] }]
        : [];
      const doc = product.body as { type: "doc"; content: unknown[] };
      return (
        <BlockScope type="rich_text" background={background}>
          <RichTextRender data={{ ...common, content: { ...doc, content: [...heading, ...doc.content] } as RichTextData["content"] }} />
        </BlockScope>
      );
    }
    case "product_specs":
      if (product.product_specs.length === 0) return null;
      return (
        <BlockScope type="spec_table" background={background}>
          <SpecTableRender
            data={{
              ...common,
              title: title || undefined,
              specs: product.product_specs.map((s) => ({ label: s.label, value: s.value, unit: s.unit ?? undefined })),
            }}
          />
        </BlockScope>
      );
  }
}

/**
 * The whole product detail page body. Shared by the public route and the
 * staff-only draft preview (`/preview/products/...`); `isPreview` only adds
 * staff-facing placeholders and drops analytics/JSON-LD, it never changes
 * what a visitor sees.
 */
export function ProductDetailView({
  product,
  relatedProducts,
  resources,
  isPreview = false,
}: {
  product: ProductDetail;
  relatedProducts: { slug: string; name: string; summary: string | null; categorySlug: string | null }[];
  resources: Pick<Tables<"resources">, "id" | "title" | "file_url">[];
  isPreview?: boolean;
}) {
  const category = product.categorySlug ?? "";
  const productUrl = absoluteUrl(productHref(category, product.slug));
  const productImage = product.hero_image_url ?? product.diagram_image_url;

  return (
    <>
      {!isPreview && (
      <JsonLd
        data={productJsonLd({
          name: product.name,
          description: product.summary,
          url: productUrl,
          image: productImage ? resolveOgImage(productImage, null) : undefined,
        })}
      />
      )}
      {!isPreview && (
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", url: absoluteUrl("/") },
          { name: "Products", url: absoluteUrl("/products") },
          { name: product.name, url: productUrl },
        ])}
      />
      )}
      {!isPreview && <RecordProductView slug={product.slug} />}
      <BlockScope type="product_hero" background="navy">
        <ProductHeroRender
          data={{
            background: "navy",
            spacingTop: "md",
            spacingBottom: "lg",
            eyebrow: product.eyebrow ?? undefined,
            title: product.name,
            paragraphs: splitParagraphs(product.summary),
            diagramImageUrl: product.diagram_image_url ?? undefined,
            ctaLabel: "Find a distributor",
            ctaHref: "/contact",
          }}
        />
      </BlockScope>
      {resolveLayout(product.product_blocks as LayoutRow[]).map((row, index) => (
        <LayoutRowView key={row.id ?? `${row.type}-${index}`} row={row} product={product} isPreview={isPreview} />
      ))}
      {relatedProducts.length > 0 && (
        <Section background="navy" spacingTop="md" spacingBottom="md">
          <h2 className="font-editorial text-section font-semibold text-balance">Related products</h2>
          <div className="mt-8">
            {/*
              LabelPlateGrid directly, not RecommendationsClient: this is
              the admin's curated product_related list, not the
              algorithmic "based on your browsing history" recommendations
              block — RecommendationsClient re-filters to recently-viewed
              items whenever the visitor has viewed any of them, which
              would silently drop curated entries the visitor hasn't
              viewed yet (and swap post-hydration). LabelPlateGrid renders
              the shared, fully scannable discovery cards directly, with
              no extra recommendation or disclosure state here.
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
          <h2 className="font-editorial text-section font-semibold text-balance">Resources</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {resources.map((resource) => (
              <li key={resource.id}>
                <a
                  href={resource.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-h-16 items-center justify-between gap-4 rounded-[var(--site-radius-md)] border border-[var(--site-border)] bg-[var(--site-surface-raised)] px-5 py-3 text-sm font-semibold transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-osi-steel-500/35"
                >
                  <span>{resource.title}</span><span aria-hidden className="text-osi-gold-700">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
