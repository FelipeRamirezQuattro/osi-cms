import { describe, expect, it } from "vitest";
import {
  extractImageUrls,
  extractImageUrlsFromBlocks,
  findDuplicateAnchorGroups,
  findDuplicateAnchorIds,
  findUnsafeLinksInBlocks,
  findUnsafeLinksInData,
  runSyncPreflightChecks,
} from "@/lib/validation/preflight";

describe("findDuplicateAnchorGroups", () => {
  it("returns nothing when every anchor is unique or empty", () => {
    const blocks = [{ type: "hero_full", data: { anchorId: "top" } }, { type: "rich_text", data: {} }, { type: "cta_band", data: { anchorId: "cta" } }];
    expect(findDuplicateAnchorGroups(blocks)).toEqual([]);
  });

  it("flags two blocks sharing the same anchor, with both block indexes", () => {
    const blocks = [
      { type: "hero_full", data: { anchorId: "features" } },
      { type: "rich_text", data: {} },
      { type: "cta_band", data: { anchorId: "features" } },
    ];
    const result = findDuplicateAnchorGroups(blocks);
    expect(result).toHaveLength(1);
    expect(result[0].anchorId).toBe("features");
    expect(result[0].blockIndexes).toEqual([0, 2]);
  });

  it("treats a whitespace-only anchor as empty (not a duplicate with another blank)", () => {
    const blocks = [{ type: "a", data: { anchorId: "   " } }, { type: "b", data: { anchorId: "" } }];
    expect(findDuplicateAnchorGroups(blocks)).toEqual([]);
  });

  it("flags three-way duplicates as one entry listing all three indexes", () => {
    const blocks = [
      { type: "a", data: { anchorId: "x" } },
      { type: "b", data: { anchorId: "x" } },
      { type: "c", data: { anchorId: "x" } },
    ];
    const result = findDuplicateAnchorGroups(blocks);
    expect(result).toHaveLength(1);
    expect(result[0].blockIndexes).toEqual([0, 1, 2]);
  });
});

describe("findDuplicateAnchorIds", () => {
  it("renders one PreflightWarning per duplicate group, naming the anchor and 1-based block numbers", () => {
    const blocks = [
      { type: "hero_full", data: { anchorId: "features" } },
      { type: "cta_band", data: { anchorId: "features" } },
    ];
    const warnings = findDuplicateAnchorIds(blocks);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].code).toBe("duplicate_anchor");
    expect(warnings[0].message).toContain("features");
    expect(warnings[0].message).toContain("blocks 1, 2");
  });
});

describe("findUnsafeLinksInData", () => {
  it("flags a javascript: URL under a link-shaped key", () => {
    expect(findUnsafeLinksInData({ ctaUrl: "javascript:alert(1)" })).toEqual(["javascript:alert(1)"]);
  });

  it("allows a safe internal path, an https URL, an anchor, and a mailto", () => {
    expect(findUnsafeLinksInData({ href: "/about-us" })).toEqual([]);
    expect(findUnsafeLinksInData({ url: "https://example.com" })).toEqual([]);
    expect(findUnsafeLinksInData({ href: "#section" })).toEqual([]);
    expect(findUnsafeLinksInData({ cta_url: "mailto:info@example.com" })).toEqual([]);
  });

  it("ignores string values under a key that doesn't look like a link", () => {
    expect(findUnsafeLinksInData({ title: "javascript:not-actually-a-link-field" })).toEqual([]);
  });

  it("walks nested objects and arrays", () => {
    const data = { items: [{ cta: { href: "javascript:evil()" } }, { cta: { href: "/fine" } }] };
    expect(findUnsafeLinksInData(data)).toEqual(["javascript:evil()"]);
  });
});

describe("findUnsafeLinksInBlocks", () => {
  it("reports the offending block's index and type in the message", () => {
    const blocks = [
      { type: "cta_band", data: { href: "/fine" } },
      { type: "hero_full", data: { href: "javascript:alert(1)" } },
    ];
    const warnings = findUnsafeLinksInBlocks(blocks);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].blockIndex).toBe(1);
    expect(warnings[0].message).toContain("hero_full");
  });
});

describe("extractImageUrls / extractImageUrlsFromBlocks", () => {
  it("finds an absolute image URL nested anywhere in the data", () => {
    expect(extractImageUrls({ hero: { image: "https://cdn.example.com/a/b.jpg" } })).toEqual([
      "https://cdn.example.com/a/b.jpg",
    ]);
  });

  it("ignores a non-image URL and a relative path", () => {
    expect(extractImageUrls({ href: "https://example.com/about", src: "/local/photo.jpg" })).toEqual([]);
  });

  it("dedupes the same URL used twice, across multiple blocks", () => {
    const blocks = [
      { type: "a", data: { image: "https://cdn.example.com/x.png" } },
      { type: "b", data: { image: "https://cdn.example.com/x.png" } },
    ];
    expect(extractImageUrlsFromBlocks(blocks)).toEqual(["https://cdn.example.com/x.png"]);
  });
});

describe("runSyncPreflightChecks", () => {
  it("aggregates duplicate-anchor and unsafe-link warnings together", () => {
    const blocks = [
      { type: "hero_full", data: { anchorId: "dup", href: "javascript:alert(1)" } },
      { type: "cta_band", data: { anchorId: "dup" } },
    ];
    const warnings = runSyncPreflightChecks(blocks);
    const codes = warnings.map((w) => w.code).sort();
    expect(codes).toEqual(["duplicate_anchor", "unsafe_link"]);
  });

  it("returns no warnings for clean blocks", () => {
    const blocks = [{ type: "hero_full", data: { anchorId: "top", href: "/fine" } }];
    expect(runSyncPreflightChecks(blocks)).toEqual([]);
  });
});
