import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductDetailView } from "@/components/products/product-detail-view";
import type { ProductDetail } from "@/lib/data/products";

/**
 * Golden-output guard for the product page's fixed template. A product with
 * no linked section rows (the state of every product before the ordered
 * layout shipped) must keep rendering exactly this markup; the snapshot was
 * recorded from the renderer BEFORE the ordered-layout change.
 */
function product(overrides: Partial<ProductDetail> = {}): ProductDetail {
  return {
    id: "p1",
    slug: "gas-release-system",
    categorySlug: "gas-separation",
    locale: "en",
    name: "Gas Release System",
    eyebrow: "Gas separation",
    tagline: null,
    badge: "none",
    summary: "First paragraph.\n\nSecond paragraph.",
    body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Body copy." }] }] },
    hero_image_url: null,
    diagram_image_url: "https://legacy.example.com/diagram.png",
    video_url: "https://www.youtube.com/embed/abc123",
    brochure_pdf_url: "https://legacy.example.com/sheet.pdf",
    model_3d_url: "https://legacy.example.com/model",
    status: "published",
    position: 0,
    seo_title: null,
    seo_description: null,
    category_id: "cat-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    product_benefits: [
      { id: "b1", product_id: "p1", title: "Less gas lock", body: "Releases gas", position: 0, icon_key: null },
      { id: "b2", product_id: "p1", title: "Longer run life", body: null, position: 1, icon_key: null },
    ],
    product_stages: [{ id: "s1", product_id: "p1", title: "Stage one", body: "Step", image_url: null, position: 0 }],
    product_specs: [{ id: "sp1", product_id: "p1", label: "OD", value: "2.375", unit: "in", position: 0 }],
    product_blocks: [
      {
        id: "x1",
        product_id: "p1",
        type: "rich_text",
        position: 10,
        is_visible: true,
        data: {
          background: "cream",
          spacingTop: "md",
          spacingBottom: "md",
          content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Extra block text." }] }] },
        },
      },
    ],
    ...overrides,
  } as unknown as ProductDetail;
}

const view = (p: ProductDetail, isPreview = false) =>
  renderToStaticMarkup(<ProductDetailView product={p} relatedProducts={[]} resources={[]} isPreview={isPreview} />);

describe("ProductDetailView — template with no linked rows", () => {
  it("full product renders the unchanged template", () => {
    expect(view(product())).toMatchSnapshot();
  });
  it("sparse product (no benefits/stages/specs/body) renders the unchanged template", () => {
    expect(
      view(product({ product_benefits: [], product_stages: [], product_specs: [], product_blocks: [], body: null, video_url: null })),
    ).toMatchSnapshot();
  });
  it("preview of a product with no downloads keeps the placeholders", () => {
    expect(view(product({ brochure_pdf_url: null, model_3d_url: null }), true)).toMatchSnapshot();
  });
});
