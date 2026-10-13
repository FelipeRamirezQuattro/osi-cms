import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  RecommendationsClient,
  getViewedSnapshot,
  parseViewedSlugs,
  type RecommendableProduct,
} from "@/components/blocks/recommendations-client";
import { productHref } from "@/lib/routes";

/**
 * Covers the plan's broken-link bullet for recommendations: "must
 * generate /products/{category}/{slug}". RecommendationsClient builds
 * each card's href via lib/routes.ts's productHref — this renders it with
 * fixture products and asserts the default-open card's real <a href>
 * matches productHref(categorySlug, slug) for that product, plus the
 * /products fallback for a product with no resolved category.
 *
 * Uses react-dom/server's renderToStaticMarkup (server snapshot) for the href
 * checks; the interactive-mount regression is covered separately below.
 */

function firstLinkHref(fallback: RecommendableProduct[], limit = 4): string | null {
  const html = renderToStaticMarkup(<RecommendationsClient fallback={fallback} limit={limit} />);
  const container = document.createElement("div");
  container.innerHTML = html;
  return container.querySelector("a")?.getAttribute("href") ?? null;
}

describe("RecommendationsClient generates routes via lib/routes.ts's productHref", () => {
  it("the default-open card's link is productHref(categorySlug, slug)", () => {
    const fallback: RecommendableProduct[] = [
      { slug: "gas-release-system", name: "Gas Release System", summary: "s1", categorySlug: "gas-separation" },
    ];
    expect(firstLinkHref(fallback)).toBe(productHref("gas-separation", "gas-release-system"));
  });

  it("a different product's link still matches productHref(categorySlug, slug)", () => {
    const fallback: RecommendableProduct[] = [
      { slug: "esp-chem-screen", name: "ESP Chem Screen", summary: "s2", categorySlug: "pumps" },
    ];
    expect(firstLinkHref(fallback)).toBe(productHref("pumps", "esp-chem-screen"));
  });

  it("falls back to /products (never a dead link) for a product with no resolved category slug", () => {
    const fallback: RecommendableProduct[] = [{ slug: "orphan", name: "Orphan", summary: null, categorySlug: null }];
    expect(firstLinkHref(fallback)).toBe("/products");
  });

  it("renders nothing when there are no products to recommend", () => {
    const html = renderToStaticMarkup(<RecommendationsClient fallback={[]} limit={4} />);
    expect(html).toBe("");
  });
});

describe("recently-viewed snapshot (BLQ-26)", () => {
  afterEach(() => localStorage.clear());

  it("returns an identical value across calls, so useSyncExternalStore never loops", () => {
    localStorage.setItem("osi:viewed", JSON.stringify(["a", "b"]));
    expect(getViewedSnapshot()).toBe(getViewedSnapshot());
    localStorage.clear();
    expect(getViewedSnapshot()).toBe(getViewedSnapshot());
  });

  it("parses defensively", () => {
    expect(parseViewedSlugs(null)).toEqual([]);
    expect(parseViewedSlugs("not json")).toEqual([]);
    expect(parseViewedSlugs('{"a":1}')).toEqual([]);
    expect(parseViewedSlugs('["a",1,"b"]')).toEqual(["a", "b"]);
  });

  it("mounts interactively without 'Maximum update depth' and prefers viewed products", () => {
    localStorage.setItem("osi:viewed", JSON.stringify(["two"]));
    const fallback: RecommendableProduct[] = [
      { slug: "one", name: "Product One", summary: null, categorySlug: "c" },
      { slug: "two", name: "Product Two", summary: null, categorySlug: "c" },
    ];
    render(<RecommendationsClient fallback={fallback} limit={4} />);
    expect(screen.getByText("Product Two")).toBeTruthy();
    expect(screen.queryByText("Product One")).toBeNull();
  });
});
