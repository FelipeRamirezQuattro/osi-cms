import { describe, expect, it } from "vitest";
import { MAX_PATH_LENGTH, isTrackablePath } from "@/lib/analytics/trackable";

describe("isTrackablePath", () => {
  it("accepts public site paths", () => {
    for (const path of ["/", "/products", "/products/sand-control/x", "/news/y?utm_source=a"]) expect(isTrackablePath(path)).toBe(true);
  });
  it("rejects admin, preview, api and internal paths in any case", () => {
    for (const path of ["/admin", "/admin/pages", "/ADMIN/pages", "/preview/x", "/api/analytics/collect", "/_next/data", "/styleguide", "/admin?x=1"]) {
      expect(isTrackablePath(path), path).toBe(false);
    }
  });
  it("does not over-match lookalike public paths", () => {
    expect(isTrackablePath("/administration")).toBe(true);
    expect(isTrackablePath("/previews-of-things")).toBe(true);
  });
  it("rejects non-paths and absurd lengths", () => {
    expect(isTrackablePath("https://evil.test/")).toBe(false);
    expect(isTrackablePath("//evil.test")).toBe(false);
    expect(isTrackablePath("")).toBe(false);
    expect(isTrackablePath(`/${"a".repeat(MAX_PATH_LENGTH)}`)).toBe(false);
  });
});
