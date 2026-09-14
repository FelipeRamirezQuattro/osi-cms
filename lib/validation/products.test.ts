import { describe, expect, it } from "vitest";
import { productSaveInputSchema } from "@/lib/validation/products";

function baseProduct(overrides: Record<string, unknown> = {}) {
  return {
    name: "Gas Release System",
    slug: "gas-release-system",
    category_id: "cat-1",
    status: "draft",
    ...overrides,
  };
}

describe("productSaveInputSchema", () => {
  it("accepts a minimal valid draft product and normalizes omitted optional fields to null/[]", () => {
    const result = productSaveInputSchema.safeParse(baseProduct());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.eyebrow).toBeNull();
      expect(result.data.badge).toBeNull();
      expect(result.data.benefits).toEqual([]);
    }
  });

  it("rejects a blank name or slug", () => {
    expect(productSaveInputSchema.safeParse(baseProduct({ name: "" })).success).toBe(false);
    expect(productSaveInputSchema.safeParse(baseProduct({ slug: "" })).success).toBe(false);
  });

  it('normalizes badge "none" to null and accepts "new"/"featured"', () => {
    const none = productSaveInputSchema.safeParse(baseProduct({ badge: "none" }));
    expect(none.success && none.data.badge).toBeNull();
    const featured = productSaveInputSchema.safeParse(baseProduct({ badge: "featured" }));
    expect(featured.success && featured.data.badge).toBe("featured");
  });

  it("requires category_id when status is published (canonical URL needs the category slug)", () => {
    const result = productSaveInputSchema.safeParse(baseProduct({ category_id: "", status: "published" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["category_id"]);
    }
  });

  it("allows a draft product with no category", () => {
    const result = productSaveInputSchema.safeParse(baseProduct({ category_id: "", status: "draft" }));
    expect(result.success).toBe(true);
  });

  it("allows publishing once category_id is set", () => {
    const result = productSaveInputSchema.safeParse(baseProduct({ category_id: "cat-1", status: "published" }));
    expect(result.success).toBe(true);
  });

  it("rejects an unsafe brochure/video/3D-model URL", () => {
    expect(productSaveInputSchema.safeParse(baseProduct({ brochure_pdf_url: "javascript:alert(1)" })).success).toBe(false);
    expect(productSaveInputSchema.safeParse(baseProduct({ video_url: "javascript:alert(1)" })).success).toBe(false);
  });

  it("accepts a real brochure URL and normalizes a blank one to null", () => {
    const withUrl = productSaveInputSchema.safeParse(baseProduct({ brochure_pdf_url: "https://osi.example/brochure.pdf" }));
    expect(withUrl.success && withUrl.data.brochure_pdf_url).toBe("https://osi.example/brochure.pdf");
    const blank = productSaveInputSchema.safeParse(baseProduct({ brochure_pdf_url: "" }));
    expect(blank.success && blank.data.brochure_pdf_url).toBeNull();
  });

  it("requires every benefit/stage/spec item to have its title/label filled in", () => {
    expect(productSaveInputSchema.safeParse(baseProduct({ benefits: [{ title: "" }] })).success).toBe(false);
    expect(productSaveInputSchema.safeParse(baseProduct({ specs: [{ label: "Weight", value: "" }] })).success).toBe(false);
  });
});
