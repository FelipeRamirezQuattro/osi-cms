import { describe, expect, it } from "vitest";
import { buildRedirectIndex, matchRedirect, normalizePath } from "@/lib/redirects/matcher";

const index = buildRedirectIndex([
  { from_path: "/services-4", to_path: "/services", status_code: 301 },
  { from_path: "/Osidirectory", to_path: "/contact", status_code: 301 },
  { from_path: "/old-temp", to_path: "/new", status_code: 302 },
  { from_path: "/gasreleasesystem", to_path: "/products/gas-separation/gas-release-system", status_code: 308 },
  { from_path: "/with-query", to_path: "/dest?ref=legacy", status_code: 301 },
  { from_path: "/external", to_path: "https://example.com/x", status_code: 301 },
]);

describe("normalizePath", () => {
  it("drops trailing slashes but keeps the root", () => {
    expect(normalizePath("/a/b/")).toBe("/a/b");
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("")).toBe("/");
  });
  it("decodes percent-encoding and tolerates malformed input", () => {
    expect(normalizePath("/caf%C3%A9")).toBe("/café");
    expect(normalizePath("/bad%E0%A4%A")).toBe("/bad%E0%A4%A");
  });
});

describe("matchRedirect", () => {
  it("returns the stored status and destination", () => {
    expect(matchRedirect(index, "/services-4")).toEqual({ location: "/services", status: 301 });
    expect(matchRedirect(index, "/old-temp")).toEqual({ location: "/new", status: 302 });
    expect(matchRedirect(index, "/gasreleasesystem")?.status).toBe(308);
  });

  it("returns null for a path with no redirect", () => {
    expect(matchRedirect(index, "/about-us")).toBeNull();
    expect(matchRedirect(index, "/")).toBeNull();
  });

  it("ignores a trailing slash and matches case-insensitively (exact case wins)", () => {
    expect(matchRedirect(index, "/services-4/")?.location).toBe("/services");
    expect(matchRedirect(index, "/osidirectory")?.location).toBe("/contact");
    const both = buildRedirectIndex([
      { from_path: "/Page", to_path: "/upper", status_code: 301 },
      { from_path: "/page", to_path: "/lower", status_code: 301 },
    ]);
    expect(matchRedirect(both, "/page")?.location).toBe("/lower");
    expect(matchRedirect(both, "/Page")?.location).toBe("/upper");
  });

  it("preserves the visitor's query string", () => {
    expect(matchRedirect(index, "/services-4", "?utm_source=x&a=1")?.location).toBe("/services?utm_source=x&a=1");
    expect(matchRedirect(index, "/services-4", "utm_source=x")?.location).toBe("/services?utm_source=x");
    expect(matchRedirect(index, "/services-4", "")?.location).toBe("/services");
  });

  it("merges with a destination that has its own query (destination wins on conflict)", () => {
    expect(matchRedirect(index, "/with-query", "?x=1&ref=other")?.location).toBe("/dest?ref=legacy&x=1");
  });

  it("passes an absolute destination through", () => {
    expect(matchRedirect(index, "/external", "?q=1")?.location).toBe("https://example.com/x?q=1");
  });

  it("flattens a chain to the final destination in one hop, keeping the first row's status", () => {
    const chained = buildRedirectIndex([
      { from_path: "/a", to_path: "/b", status_code: 301 },
      { from_path: "/b", to_path: "/c", status_code: 302 },
    ]);
    expect(matchRedirect(chained, "/a")).toEqual({ location: "/c", status: 301 });
  });

  it("returns null on a loop instead of redirecting forever", () => {
    const loop = buildRedirectIndex([
      { from_path: "/a", to_path: "/b", status_code: 301 },
      { from_path: "/b", to_path: "/a", status_code: 301 },
    ]);
    expect(matchRedirect(loop, "/a")).toBeNull();
    expect(matchRedirect(buildRedirectIndex([{ from_path: "/s", to_path: "/s", status_code: 301 }]), "/s")).toBeNull();
  });

  it("refuses a chain that is still going after the hop cap", () => {
    const rows = Array.from({ length: 8 }, (_, i) => ({ from_path: `/p${i}`, to_path: `/p${i + 1}`, status_code: 301 }));
    expect(matchRedirect(buildRedirectIndex(rows), "/p0")).toBeNull();
  });
});
