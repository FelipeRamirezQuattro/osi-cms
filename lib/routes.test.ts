import { describe, expect, it } from "vitest";
import {
  applicationHref,
  industryHref,
  isSafeHref,
  newsHref,
  pageHref,
  productHref,
} from "@/lib/routes";

describe("CMS route helpers", () => {
  it("constructs every structured content route", () => {
    expect(productHref("gas lift", "nova/x")).toBe("/products/gas%20lift/nova%2Fx");
    expect(newsHref("new-tool")).toBe("/news/new-tool");
    expect(industryHref("oil-gas")).toBe("/industries/oil-gas");
    expect(applicationHref("artificial-lift")).toBe("/applications/artificial-lift");
  });

  it("normalizes CMS page slugs", () => {
    expect(pageHref("home")).toBe("/");
    expect(pageHref("/services/machine-shop/")).toBe("/services/machine-shop");
  });

  it("rejects executable and protocol-relative URLs", () => {
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref("data:text/html,bad")).toBe(false);
    expect(isSafeHref("//evil.example")).toBe(false);
    expect(isSafeHref("/contact")).toBe(true);
    expect(isSafeHref("https://osi.example/file.pdf")).toBe(true);
    expect(isSafeHref("#details", { allowAnchor: true })).toBe(true);
  });
});
