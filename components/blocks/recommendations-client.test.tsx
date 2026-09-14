import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RecommendationsClient, type RecommendableProduct } from "@/components/blocks/recommendations-client";
import { productHref } from "@/lib/routes";

/**
 * Covers the plan's broken-link bullet for recommendations: "must
 * generate /products/{category}/{slug}". RecommendationsClient builds
 * each card's href via lib/routes.ts's productHref — this renders it with
 * fixture products and asserts the default-open card's real <a href>
 * matches productHref(categorySlug, slug) for that product, plus the
 * /products fallback for a product with no resolved category.
 *
 * Uses react-dom/server's renderToStaticMarkup rather than
 * @testing-library/react's render(): RecommendationsClient reads
 * recently-viewed slugs via useSyncExternalStore, whose client snapshot
 * function (getViewedSlugs) does `JSON.parse(localStorage.getItem(...) ??
 * "[]")` — a fresh array on every call, which violates
 * useSyncExternalStore's "getSnapshot must return a cached/stable
 * reference" contract. That's a genuine, pre-existing bug in
 * components/blocks/recommendations-client.tsx (found while writing this
 * test, out of scope for this task — see task-1-report.md): mounting this
 * component with React's interactive renderer immediately throws "Maximum
 * update depth exceeded" in this repo's React 19 dev build, in a plain
 * render with no interaction at all. renderToStaticMarkup never runs
 * effects and always uses getServerSnapshot (a stable `[]`), so it
 * sidesteps the bug entirely and still proves what this test cares about:
 * the hrefs LabelPlateGrid/LabelPlateCard render.
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
