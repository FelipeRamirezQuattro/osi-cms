import { describe, expect, it } from "vitest";
import {
  isIndexableHost,
  isIndexingEnabled,
  isSiteIndexable,
  normalizeHost,
  reviewHostRedirectTarget,
} from "@/lib/indexing";

describe("normalizeHost", () => {
  it("lower-cases, strips the port and takes the first forwarded host", () => {
    expect(normalizeHost("OdessaSeparator.com:443")).toBe("odessaseparator.com");
    expect(normalizeHost("a.com, b.com")).toBe("a.com");
    expect(normalizeHost(null)).toBeNull();
    expect(normalizeHost("")).toBeNull();
  });
});

describe("isSiteIndexable", () => {
  const on = { SITE_INDEXABLE: "true" };

  it("is indexable only on the production hosts with the switch on", () => {
    expect(isSiteIndexable("odessaseparator.com", on)).toBe(true);
    expect(isSiteIndexable("www.odessaseparator.com", on)).toBe(true);
    expect(isSiteIndexable("www.odessaseparator.com:443", on)).toBe(true);
  });

  it("is never indexable on the review or preview hosts, even with the switch on", () => {
    expect(isSiteIndexable("osi-cms.vercel.app", on)).toBe(false);
    expect(isSiteIndexable("osi-cms-git-main-team.vercel.app", on)).toBe(false);
    expect(isSiteIndexable("osi-cms-abc123.vercel.app", on)).toBe(false);
    expect(isSiteIndexable("localhost:3000", on)).toBe(false);
    expect(isSiteIndexable("evil-odessaseparator.com", on)).toBe(false);
    expect(isSiteIndexable("odessaseparator.com.evil.test", on)).toBe(false);
  });

  it("is not indexable without the switch, whatever the host", () => {
    expect(isSiteIndexable("odessaseparator.com", {})).toBe(false);
    expect(isSiteIndexable("odessaseparator.com", { SITE_INDEXABLE: "false" })).toBe(false);
    expect(isSiteIndexable("odessaseparator.com", { SITE_INDEXABLE: "1" })).toBe(false);
  });

  it("fails closed when the host is unknown", () => {
    expect(isSiteIndexable(null, on)).toBe(false);
    expect(isSiteIndexable(undefined, on)).toBe(false);
  });

  it("exposes the two halves separately", () => {
    expect(isIndexingEnabled(on)).toBe(true);
    expect(isIndexingEnabled({})).toBe(false);
    expect(isIndexableHost("odessaseparator.com")).toBe(true);
    expect(isIndexableHost("osi-cms.vercel.app")).toBe(false);
  });
});

describe("reviewHostRedirectTarget", () => {
  const on = { REVIEW_HOST_REDIRECT: "true" };

  it("301s the review host to the same path on the production domain", () => {
    expect(reviewHostRedirectTarget("osi-cms.vercel.app", "/products/x?y=1", on)).toBe(
      "https://odessaseparator.com/products/x?y=1",
    );
  });

  it("does nothing until the switch is on", () => {
    expect(reviewHostRedirectTarget("osi-cms.vercel.app", "/", {})).toBeNull();
  });

  it("leaves preview deployments and the production host alone", () => {
    expect(reviewHostRedirectTarget("osi-cms-git-main-team.vercel.app", "/", on)).toBeNull();
    expect(reviewHostRedirectTarget("osi-cms-abc123.vercel.app", "/", on)).toBeNull();
    expect(reviewHostRedirectTarget("odessaseparator.com", "/", on)).toBeNull();
  });
});
