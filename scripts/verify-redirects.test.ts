import { describe, expect, it } from "vitest";
import { judge, locationOnHost } from "./verify-redirects";
import type { RedirectIndexRow } from "@/lib/redirects/resolver";

const BASE = "https://odessaseparator.com";
const pathRow = (overrides: Partial<RedirectIndexRow> = {}): RedirectIndexRow => ({
  from_path: "/services-4",
  to_path: "/services",
  status_code: 301,
  target_kind: "path",
  product_published: null,
  product_slug: null,
  category_slug: null,
  page_published: null,
  page_slug: null,
  fallback_path: null,
  ...overrides,
});

describe("locationOnHost", () => {
  it("reduces a same-host Location to path and query, absolute or relative", () => {
    expect(locationOnHost("https://odessaseparator.com/services?a=1", BASE)).toBe("/services?a=1");
    expect(locationOnHost("/services", BASE)).toBe("/services");
  });
  it("keeps a Location on another host whole, so a host change is visible", () => {
    expect(locationOnHost("https://odessaseparator.com/x", "https://osi-cms.vercel.app")).toBe("https://odessaseparator.com/x");
  });
  it("is null without a Location", () => {
    expect(locationOnHost(null, BASE)).toBeNull();
  });
});

describe("judge", () => {
  it("passes a matching status and Location", () => {
    expect(judge(pathRow(), { status: 301, location: "/services" }, BASE).result).toBe("ok");
  });
  it("flags a wrong status, a wrong Location and a missing Location", () => {
    expect(judge(pathRow(), { status: 308, location: "/services" }, BASE).result).toBe("mismatch");
    expect(judge(pathRow(), { status: 301, location: "/elsewhere" }, BASE).result).toBe("mismatch");
    expect(judge(pathRow(), { status: 404, location: null }, BASE).note).toContain("no Location");
  });
  it("treats a 200 as a published page shadowing the redirect, not a failure", () => {
    expect(judge(pathRow(), { status: 200, location: null }, BASE).result).toBe("page-wins");
  });
  it("reports a network error", () => {
    expect(judge(pathRow(), { status: 0, location: null, error: "TimeoutError" }, BASE).result).toBe("error");
  });
  it("resolves a draft product to its category listing", () => {
    const row = pathRow({ from_path: "/esp-sand-lift", target_kind: "product", product_published: false, product_slug: "esp-sand-lift", category_slug: "chemical-treatment", to_path: null });
    expect(judge(row, { status: 301, location: "/products?category=chemical-treatment" }, BASE).result).toBe("ok");
  });
});
