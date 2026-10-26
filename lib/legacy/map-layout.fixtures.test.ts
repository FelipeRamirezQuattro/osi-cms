import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LEGACY_ENTRIES } from "./batch2-manifest";
import { findChromeImages, type ScrapedPage } from "./map";
import { mapProductLayout, type LayoutSeed, type MappedProductLayout } from "./map-layout";
import { LINKED_SECTION_TYPES, isLinkedSectionType } from "../products/layout";
import { getBlockDefinition } from "@/lib/blocks/registry";

/**
 * The ordered-layout mapper against the REAL visual-order scrape
 * (content/legacy/pages-products): the products QA flagged in rows 9, 11, 17,
 * 21, 23 and 30 of the Oct 21–24 report.
 */
const DIR = path.join(process.cwd(), "content/legacy/pages-products");
const pages = fs
  .readdirSync(DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as ScrapedPage & { slug: string });
const ctx = { chromeImages: findChromeImages(pages) };

function map(slug: string): MappedProductLayout {
  const entry = LEGACY_ENTRIES.find((e) => e.slug === slug)!;
  return mapProductLayout(entry, pages.find((p) => p.slug === slug)!, ctx);
}
const json = (v: unknown) => JSON.stringify(v);
const indexOf = (m: MappedProductLayout, pred: (r: LayoutSeed) => boolean) => m.layout.findIndex(pred);
const textOf = (r: LayoutSeed) => json(r.data);

describe("mapProductLayout on the saved visual-order scrape", () => {
  it("every product keeps each linked section exactly once and every extra block is valid", () => {
    for (const p of pages) {
      const m = map(p.slug);
      for (const t of LINKED_SECTION_TYPES) expect(m.layout.filter((r) => r.type === t), `${p.slug} ${t}`).toHaveLength(1);
      for (const r of m.layout.filter((x) => !isLinkedSectionType(x.type))) {
        const def = getBlockDefinition(r.type);
        expect(def, `${p.slug}: ${r.type}`).toBeTruthy();
        const parsed = def!.schema.safeParse(r.data);
        expect(parsed.success, `${p.slug} ${r.type}: ${parsed.success ? "" : parsed.error.message}`).toBe(true);
      }
    }
  });

  it("row 9 (ESP Screen Vortex Desander): no stray TM, intro first, both videos before the downloads", () => {
    const m = map("esp-screen-vortex-desander");
    expect(json(m)).not.toMatch(/\bTM\b/);
    expect(m.summary).toMatch(/^The ESP Screen Vortex Desander is designed/);
    const videos = m.layout.map((r, i) => (r.type === "media_text" || r.type === "video_embed" ? i : -1)).filter((i) => i >= 0);
    expect(videos.length).toBeGreaterThanOrEqual(2);
    const downloads = indexOf(m, (r) => r.type === "product_downloads");
    expect(Math.max(...videos)).toBeLessThan(downloads);
  });

  it("row 11 (ESP Vortex Desander): the 'Our GV Cup Packer' text sits with its video, before the 3D section", () => {
    const m = map("esp-vortex-desander");
    const media = m.layout.find((r) => r.type === "media_text" && textOf(r).includes("Our GV Cup Packer"));
    expect(media, "media_text with the paragraph").toBeTruthy();
    expect(media!.data.videoUrl).toMatch(/In1eILk78_4/);
    expect(indexOf(m, (r) => r === media)).toBeLessThan(indexOf(m, (r) => r.type === "product_downloads"));
    // The video is shown once: the linked Video row is hidden.
    expect(m.layout.find((r) => r.type === "product_video")!.is_visible).toBe(false);
  });

  it("row 17 (Bumper Spring): 'Extended'/'Compressed' are captions, not body text; the wells text is above the video; headings keep OSI as an acronym", () => {
    const m = map("bumper-spring");
    const richText = m.layout.filter((r) => r.type === "rich_text").map(textOf).join(" ");
    expect(richText).not.toMatch(/"text":"(Extended|Compressed)"/);
    expect(json(m.layout.filter((r) => r.type === "image"))).toMatch(/Extended|Compressed/);
    const flow = indexOf(m, (r) => r.type === "rich_text" && textOf(r).includes("designed for wells"));
    expect(flow).toBeGreaterThanOrEqual(0);
    expect(flow).toBeLessThan(indexOf(m, (r) => r.type === "product_video"));
    expect(json(m.layout)).toContain("The mechanics of the OSI bumper spring");
  });

  it("row 21 (G-Force): the '1.89 / 1.09' diagram labels are not body copy; Test Horizontal Well rides with the first video", () => {
    const m = map("g-force");
    expect(m.summary).not.toMatch(/1\.891\.09/);
    expect(json(m.layout.filter((r) => r.type === "rich_text"))).not.toContain("1.09");
    const media = m.layout.find((r) => r.type === "media_text" && textOf(r).includes("Test Horizontal Well"));
    expect(media, "media_text with Test Horizontal Well").toBeTruthy();
    expect(media!.data.videoUrl).toMatch(/bcIj74XSWgk/);
  });

  it("row 23 (Gas Release System): intro in paragraphs, Breaking the curve with its table image under How it works", () => {
    const m = map("gas-release-system");
    expect(m.summary!.split("\n\n").length).toBeGreaterThanOrEqual(3);
    expect(m.benefits.length).toBe(6); // the wrapped first bullet is one item, and the two text boxes are one list
    const how = indexOf(m, (r) => r.type === "rich_text" && textOf(r).includes("How it works") && textOf(r).includes("Breaking the curve"));
    expect(how).toBeGreaterThanOrEqual(0);
    const table = m.layout.findIndex((r) => r.type === "image" && /table/i.test(String(r.data.imageUrl)) === false && /Breaking the curve \(table\)/.test(String(r.data.alt)));
    expect(table, "the table is kept as an image with text alt").toBeGreaterThan(how);
  });

  it("row 30 (Chemical Injection Mandrel): the list keeps Wix's 'Features' heading and Sizes stays with its values", () => {
    const m = map("chemicalinjectionmandrel");
    expect(m.layout.find((r) => r.type === "product_benefits")!.data.title).toBe("Features");
    const sizes = m.layout.find((r) => r.type === "rich_text" && textOf(r).includes("Sizes") && textOf(r).includes("2-3/8"));
    expect(sizes, "Sizes label and values in one block").toBeTruthy();
  });
});
