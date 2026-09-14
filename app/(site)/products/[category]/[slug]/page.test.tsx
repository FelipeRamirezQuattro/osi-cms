import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ProductDetail, RelatedProduct } from "@/lib/data/products";
import type { Tables } from "@/lib/db/database.types";

/**
 * Task 7 items #6/#7: product_related and product-linked resources both
 * had real data-layer support (once #6 is wired) but zero public
 * rendering. This covers the product detail page's two new sections
 * directly — related products (via listRelatedProducts) and resources
 * (via the pre-existing but never-called listResourcesForProduct) — by
 * mocking their lib/data sources and rendering the page's default export,
 * the same "render a Server Component directly" approach news-feed.test.tsx
 * uses.
 */

const { mockGetProductBySlug, mockListRelatedProducts } = vi.hoisted(() => ({
  mockGetProductBySlug: vi.fn(),
  mockListRelatedProducts: vi.fn(),
}));
vi.mock("@/lib/data/products", () => ({
  getProductBySlug: mockGetProductBySlug,
  listRelatedProducts: mockListRelatedProducts,
}));

const { mockListResourcesForProduct } = vi.hoisted(() => ({ mockListResourcesForProduct: vi.fn() }));
vi.mock("@/lib/data/resources", () => ({ listResourcesForProduct: mockListResourcesForProduct }));

function product(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: "p1",
    slug: "gas-release-system",
    categorySlug: "gas-separation",
    locale: "en",
    name: "Gas Release System",
    eyebrow: null,
    tagline: null,
    badge: "none",
    summary: "Summary",
    body: null,
    hero_image_url: null,
    diagram_image_url: null,
    video_url: null,
    brochure_pdf_url: null,
    model_3d_url: null,
    status: "published",
    position: 0,
    seo_title: null,
    seo_description: null,
    category_id: "cat-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    product_benefits: [],
    product_stages: [],
    product_specs: [],
    ...overrides,
  } as unknown as ProductDetail;
}

function resource(overrides: Partial<Tables<"resources">> = {}): Tables<"resources"> {
  return {
    id: "r1",
    title: "Spec sheet",
    file_url: "https://legacy.example.com/spec.pdf",
    kind: "pdf",
    category: null,
    thumbnail_url: null,
    product_id: "p1",
    status: "published",
    position: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Tables<"resources">;
}

beforeEach(() => {
  mockGetProductBySlug.mockReset();
  mockListRelatedProducts.mockReset().mockResolvedValue([]);
  mockListResourcesForProduct.mockReset().mockResolvedValue([]);
});

async function renderPage() {
  const { default: ProductDetailPage } = await import(
    "@/app/(site)/products/[category]/[slug]/page"
  );
  const element = await ProductDetailPage({
    params: Promise.resolve({ category: "gas-separation", slug: "gas-release-system" }),
  } as never);
  return renderToStaticMarkup(element as React.ReactElement);
}

describe("Product detail page — related products (item #6)", () => {
  it("renders a 'Related products' section with a link to each related product", async () => {
    mockGetProductBySlug.mockResolvedValue(product());
    const related: RelatedProduct[] = [
      { slug: "esp-chem-screen", name: "ESP Chem Screen", summary: "s", categorySlug: "pumps" },
    ];
    mockListRelatedProducts.mockResolvedValue(related);

    const html = await renderPage();
    expect(html).toContain("Related products");
    expect(html).toContain("ESP Chem Screen");
    expect(html).toContain('href="/products/pumps/esp-chem-screen"');
  });

  it("renders no 'Related products' section when there are none", async () => {
    mockGetProductBySlug.mockResolvedValue(product());
    mockListRelatedProducts.mockResolvedValue([]);

    const html = await renderPage();
    expect(html).not.toContain("Related products");
  });
});

describe("Product detail page — resources (item #7)", () => {
  it("renders a minimal 'Resources' list linking each resource's file_url", async () => {
    mockGetProductBySlug.mockResolvedValue(product());
    mockListResourcesForProduct.mockResolvedValue([resource({ title: "Spec sheet" })]);

    const html = await renderPage();
    expect(html).toContain("Resources");
    expect(html).toContain("Spec sheet");
    expect(html).toContain('href="https://legacy.example.com/spec.pdf"');
  });

  it("renders no 'Resources' section when the product has none", async () => {
    mockGetProductBySlug.mockResolvedValue(product());
    mockListResourcesForProduct.mockResolvedValue([]);

    const html = await renderPage();
    expect(html).not.toContain("Resources");
  });
});
