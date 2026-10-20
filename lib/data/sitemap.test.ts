import { describe, expect, it } from "vitest";
import { filterSitemapEntries } from "@/lib/data/sitemap";

const at = (url: string) => ({ url, lastModified: "2026-10-01T00:00:00.000Z" });

describe("filterSitemapEntries", () => {
  it("keeps ordinary published URLs and their lastModified", () => {
    const entries = [at("/"), at("/about-us"), at("/products/sand-control/x"), at("/news/y")];
    expect(filterSitemapEntries(entries, [])).toEqual(entries);
  });

  it("drops prototype, staff, API and internal routes", () => {
    const entries = [at("/forge"), at("/theme-showcase"), at("/styleguide"), at("/admin/pages"), at("/preview/x"), at("/api/x"), at("/search"), at("/newsletter/confirm"), at("/system-not-found"), at("/ok")];
    expect(filterSitemapEntries(entries, []).map((e) => e.url)).toEqual(["/ok"]);
  });

  it("drops a URL that is the source of a redirect, ignoring case and a trailing slash", () => {
    const entries = [at("/old-page"), at("/Other/"), at("/keep")];
    expect(filterSitemapEntries(entries, ["/old-page", "/other"]).map((e) => e.url)).toEqual(["/keep"]);
  });
});
