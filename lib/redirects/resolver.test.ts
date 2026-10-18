import { describe, expect, it } from "vitest";
import { resolveRedirectTarget, type RedirectIndexRow } from "@/lib/redirects/resolver";

const base: RedirectIndexRow = {
  from_path: "/old",
  to_path: null,
  status_code: 301,
  target_kind: "path",
  product_published: null,
  product_slug: null,
  category_slug: null,
  page_published: null,
  page_slug: null,
  fallback_path: null,
};
const row = (over: Partial<RedirectIndexRow>): RedirectIndexRow => ({ ...base, ...over });

describe("resolveRedirectTarget", () => {
  it("path: uses the stored to_path", () => {
    expect(resolveRedirectTarget(row({ to_path: "/services" }))).toBe("/services");
  });

  describe("product", () => {
    it("published: the product's current URL, from its current category", () => {
      expect(
        resolveRedirectTarget(
          row({ target_kind: "product", product_published: true, product_slug: "esp-chem-screen", category_slug: "pumps" }),
        ),
      ).toBe("/products/pumps/esp-chem-screen");
    });

    it("draft with a category: that category's listing (never a draft's slug)", () => {
      expect(
        resolveRedirectTarget(
          row({ target_kind: "product", product_published: false, product_slug: null, category_slug: "chemical-treatment" }),
        ),
      ).toBe("/products?category=chemical-treatment");
    });

    it("a published product without a category falls back to /products", () => {
      expect(
        resolveRedirectTarget(row({ target_kind: "product", product_published: true, product_slug: "x", category_slug: null })),
      ).toBe("/products");
    });

    it("draft with no category: /products", () => {
      expect(resolveRedirectTarget(row({ target_kind: "product", product_published: false }))).toBe("/products");
    });
  });

  describe("page", () => {
    it("published: its path", () => {
      expect(resolveRedirectTarget(row({ target_kind: "page", page_published: true, page_slug: "services/pump-cards" }))).toBe(
        "/services/pump-cards",
      );
    });

    it("published home page resolves to /", () => {
      expect(resolveRedirectTarget(row({ target_kind: "page", page_published: true, page_slug: "home" }))).toBe("/");
    });

    it("draft with a fallback_path: the fallback", () => {
      expect(
        resolveRedirectTarget(row({ target_kind: "page", page_published: false, fallback_path: "/resources" })),
      ).toBe("/resources");
    });

    it("draft without a fallback_path: /", () => {
      expect(resolveRedirectTarget(row({ target_kind: "page", page_published: false }))).toBe("/");
    });
  });

  it("a redirect whose target row was deleted uses its fallback, else /products", () => {
    expect(resolveRedirectTarget(row({ target_kind: "none", fallback_path: "/news" }))).toBe("/news");
    expect(resolveRedirectTarget(row({ target_kind: "none" }))).toBe("/products");
  });
});
