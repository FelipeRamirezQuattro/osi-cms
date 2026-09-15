import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Task 15's preflight aggregation logic (runPagePreflight) — tested with
 * its three DB-touching dependencies mocked (block registry, known-path
 * set, media lookup), so this exercises the actual merge/aggregation
 * behavior (which checks land in `errors` vs. `warnings`, how many of
 * each) without a live Supabase connection. The pure per-check logic
 * itself (duplicate anchors, unsafe links, image URL extraction) is
 * covered directly in lib/validation/preflight.test.ts; this file is
 * about the assembly, not re-testing each check's internals.
 */
const mockGetBlockDefinition = vi.fn();
vi.mock("@/lib/blocks/registry", () => ({
  getBlockDefinition: (type: string) => mockGetBlockDefinition(type),
}));

const mockBuildKnownPathSet = vi.fn();
vi.mock("@/lib/data/link-audit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/data/link-audit")>("@/lib/data/link-audit");
  return { ...actual, buildKnownPathSet: () => mockBuildKnownPathSet() };
});

const mockListMediaAssetsByUrls = vi.fn();
vi.mock("@/lib/data/media", () => ({
  listMediaAssetsByUrls: (urls: string[]) => mockListMediaAssetsByUrls(urls),
}));

import { runPagePreflight } from "@/lib/data/publish-preflight";

function fakeBlockDefinition(schemaResult: { success: true } | { success: false; message: string }, label = "Block") {
  return {
    label,
    schema: {
      safeParse: () =>
        schemaResult.success ? { success: true, data: {} } : { success: false, error: { issues: [{ message: schemaResult.message }] } },
    },
  };
}

describe("runPagePreflight", () => {
  beforeEach(() => {
    mockGetBlockDefinition.mockReset();
    mockBuildKnownPathSet.mockReset().mockResolvedValue(new Set<string>(["/", "/about-us"]));
    mockListMediaAssetsByUrls.mockReset().mockResolvedValue([]);
  });

  it("reports no errors or warnings for a clean, valid page", async () => {
    mockGetBlockDefinition.mockReturnValue(fakeBlockDefinition({ success: true }));
    const result = await runPagePreflight([{ type: "rich_text", data: { anchorId: "top" } }]);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it("puts an unknown block type in errors, not warnings", async () => {
    mockGetBlockDefinition.mockReturnValue(undefined);
    const result = await runPagePreflight([{ type: "not_a_real_block", data: {} }]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("not_a_real_block");
    expect(result.warnings).toEqual([]);
  });

  it("puts a schema validation failure in errors with the block's label", async () => {
    mockGetBlockDefinition.mockReturnValue(fakeBlockDefinition({ success: false, message: "Title is required" }, "Hero"));
    const result = await runPagePreflight([{ type: "hero_full", data: {} }]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].message).toContain("Hero");
    expect(result.errors[0].message).toContain("Title is required");
  });

  it("collects a duplicate-anchor warning from the sync checks", async () => {
    mockGetBlockDefinition.mockReturnValue(fakeBlockDefinition({ success: true }));
    const blocks = [
      { type: "hero_full", data: { anchorId: "dup" } },
      { type: "cta_band", data: { anchorId: "dup" } },
    ];
    const result = await runPagePreflight(blocks);
    expect(result.errors).toEqual([]);
    expect(result.warnings.some((w) => w.code === "duplicate_anchor")).toBe(true);
  });

  it("collects a broken-link warning when a candidate path isn't in the known-path set", async () => {
    mockGetBlockDefinition.mockReturnValue(fakeBlockDefinition({ success: true }));
    const result = await runPagePreflight([{ type: "cta_band", data: { href: "/does-not-exist" } }]);
    expect(result.warnings.some((w) => w.code === "broken_link" && w.message.includes("/does-not-exist"))).toBe(true);
  });

  it("does not flag a path that is in the known-path set", async () => {
    mockGetBlockDefinition.mockReturnValue(fakeBlockDefinition({ success: true }));
    const result = await runPagePreflight([{ type: "cta_band", data: { href: "/about-us" } }]);
    expect(result.warnings.some((w) => w.code === "broken_link")).toBe(false);
  });

  it("collects a missing-alt warning for a tracked image asset with no alt text", async () => {
    mockGetBlockDefinition.mockReturnValue(fakeBlockDefinition({ success: true }));
    mockListMediaAssetsByUrls.mockResolvedValue([{ url: "https://cdn.example.com/x.jpg", alt: "", decorative: false }]);
    const result = await runPagePreflight([{ type: "image", data: { src: "https://cdn.example.com/x.jpg" } }]);
    expect(result.warnings.some((w) => w.code === "missing_alt")).toBe(true);
  });

  it("does not flag a decorative image with no alt text", async () => {
    mockGetBlockDefinition.mockReturnValue(fakeBlockDefinition({ success: true }));
    mockListMediaAssetsByUrls.mockResolvedValue([{ url: "https://cdn.example.com/x.jpg", alt: "", decorative: true }]);
    const result = await runPagePreflight([{ type: "image", data: { src: "https://cdn.example.com/x.jpg" } }]);
    expect(result.warnings.some((w) => w.code === "missing_alt")).toBe(false);
  });
});
