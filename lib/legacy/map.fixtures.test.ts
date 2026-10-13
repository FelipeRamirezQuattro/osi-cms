import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LEGACY_ENTRIES } from "./batch2-manifest";
import { findChromeImages, mapProduct, type ScrapedPage } from "./map";
import { getBlockDefinition } from "@/lib/blocks/registry";

/**
 * Mapper tests against the REAL saved scrape (content/legacy/pages-batch2),
 * so a regression in how product pages are read shows up on the same
 * content QA compared against the live Wix site.
 */
const DIR = path.join(process.cwd(), "content/legacy/pages-batch2");
const pages = fs
  .readdirSync(DIR)
  .filter((f) => /^PUB-\d+\.json$/.test(f))
  .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as ScrapedPage);
const byId = new Map(pages.map((p) => [p.id, p]));
const ctx = { chromeImages: findChromeImages(pages) };

function product(id: string) {
  const entry = LEGACY_ENTRIES.find((e) => e.id === id)!;
  return mapProduct(entry, byId.get(id)!, ctx);
}

const productEntries = LEGACY_ENTRIES.filter((e) => e.target === "product" && byId.has(e.id));

describe("mapProduct on the saved batch-2 scrape", () => {
  it("keeps the intro as separate paragraphs, once", () => {
    const m = product("PUB-024");
    expect(m.summary!.split("\n\n").length).toBeGreaterThanOrEqual(3);
    expect(m.summary).toContain("Guardian Shield");
  });

  it("imports every video, not just the first (ESP Guardian Shield has 2, Gas Shield has 3)", () => {
    const extraVideos = (id: string) => product(id).blocks.filter((b) => b.type === "video_embed").length;
    expect(product("PUB-024").videoUrl).toMatch(/youtube\.com\/embed\/HgCM4Qu9Rpc/);
    expect(extraVideos("PUB-024")).toBe(1);
    expect(extraVideos("PUB-048")).toBe(2);
  });

  it("keeps 'Advantages' as its own list with its own heading, separate from 'Benefits'", () => {
    const m = product("PUB-024");
    expect(m.benefits.length).toBeGreaterThan(0);
    const advantages = m.blocks.find((b) => b.type === "benefits_cards" || JSON.stringify(b).includes("Advantages"));
    expect(JSON.stringify(advantages)).toContain("Advantages");
  });

  it("promotes Wix pseudo-headings and keeps their body text ('Test Horizontal Well')", () => {
    const json = JSON.stringify(product("PUB-024").blocks);
    expect(json).toContain("Test Horizontal Well");
    expect(json).toContain("flow and pressure tests");
  });

  it("takes the title from the page, not the URL (Flex Tool, Sand Diverter)", () => {
    expect(product("PUB-035").name).toBe("ESP Vortex Desander With Flex Tool");
    expect(product("PUB-027").name).toBe("ESP Sand Diverter");
    expect(product("PUB-027").slug).toBe("esp-sand-d"); // slug stays from the URL
  });

  it("stores the original image, never a cropped Wix rendition", () => {
    const m = product("PUB-024");
    expect(m.diagramImageUrl).not.toMatch(/\/v1\//);
    expect(m.diagramImageUrl).toMatch(/static\.wixstatic\.com\/media\/[^/]+$/);
    expect(JSON.stringify(m.blocks)).not.toMatch(/\/v1\/(crop|fill|fit)/);
  });

  it("keeps the 3D link as a real URL for the product", () => {
    expect(product("PUB-024").model3dUrl).toMatch(/^https?:\/\//);
  });

  it("keeps comparison sections and the headings that label their images (Sand Diverter vs Previous)", () => {
    const m = product("PUB-027");
    const json = JSON.stringify(m.blocks);
    expect(json).toContain("ESP Sand Diverter vs Previous Chronological");
    expect(m.blocks.filter((b) => b.type === "image" || b.type === "image_gallery").length).toBeGreaterThanOrEqual(3);
    expect(json).not.toContain("Click here to see this tool in 3D");
  });

  it("every product's extra blocks are valid against the real block schemas", () => {
    const problems: string[] = [];
    for (const e of productEntries) {
      const m = mapProduct(e, byId.get(e.id)!, ctx);
      for (const b of m.blocks) {
        const def = getBlockDefinition(b.type);
        if (!def) problems.push(`${e.id}: unknown block ${b.type}`);
        else {
          const r = def.schema.safeParse(b.data);
          if (!r.success) problems.push(`${e.id} ${b.type}: ${r.error.issues[0]?.message}`);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});
