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

// React's useId values depend on tree position, which is not part of the contract.
const view = (p: ProductDetail, isPreview = false) =>
  renderToStaticMarkup(<ProductDetailView product={p} relatedProducts={[]} resources={[]} isPreview={isPreview} />).replace(
    /_R_[a-z0-9]+_/g,
    "_R_ID_",
  );

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

function linked(type: string, data: Record<string, unknown> = {}, is_visible = true) {
  return { id: `l-${type}`, product_id: "p1", type, position: 0, is_visible, data };
}
function text(id: string, t: string) {
  return {
    id,
    product_id: "p1",
    type: "rich_text",
    position: 0,
    is_visible: true,
    data: { background: "cream", spacingTop: "md", spacingBottom: "md", content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: t }] }] } },
  };
}
const order = (html: string, needles: string[]) => needles.map((n) => html.indexOf(n));

describe("ProductDetailView — ordered layout", () => {
  it("renders linked sections and extras in the saved order", () => {
    const html = view(
      product({
        product_blocks: [
          linked("product_specs", { title: "Sizes", background: "cream" }),
          text("t1", "Intro text"),
          linked("product_benefits", { title: "Advantages", background: "navy" }),
          linked("product_stages", { title: "Stages" }),
          linked("product_video", { title: "" }),
          linked("product_downloads", { title: "" }),
          linked("product_body", { title: "" }),
        ] as never,
      }),
    );
    const [sizes, intro, adv] = order(html, ["Sizes", "Intro text", "Advantages"]);
    expect(sizes).toBeGreaterThan(-1);
    expect(sizes).toBeLessThan(intro);
    expect(intro).toBeLessThan(adv);
    expect(html).not.toContain("Specifications");
    expect(html).not.toContain(">Benefits<");
  });

  it("an empty heading renders no heading, never the default", () => {
    const html = view(
      product({
        product_blocks: [
          linked("product_benefits", { title: "" }),
          linked("product_stages", { title: "" }),
          linked("product_video", { title: "" }),
          linked("product_downloads", { title: "" }),
          linked("product_body", { title: "" }),
          linked("product_specs", { title: "" }),
        ] as never,
      }),
    );
    expect(html).not.toContain("How does it work?");
    expect(html).not.toContain(">Benefits<");
    expect(html).not.toContain(">Specifications<");
    expect(html).not.toContain(">Stages<");
    expect(html).toContain("Download PDF");
    expect(html).toContain("Less gas lock");
  });

  it("a body heading is rendered as an h2 before the text", () => {
    const html = view(product({ product_blocks: [linked("product_body", { title: "How It Works" })] as never }));
    expect(html).toMatch(/<h2[^>]*>How It Works<\/h2>/);
    expect(html).toContain("Body copy.");
  });
});
