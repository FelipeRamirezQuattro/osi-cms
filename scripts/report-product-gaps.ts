/**
 * W4: checks the content QA said was missing (Oct 21–24, section 0.5) against
 * the visual-order scrape and the mapped layout, and lists what is still not
 * recoverable. Read-only; writes docs/qa/product-gaps.json (local).
 *
 * Usage: pnpm exec tsx scripts/report-product-gaps.ts
 */
import fs from "node:fs";
import path from "node:path";
import { LEGACY_ENTRIES } from "../lib/legacy/batch2-manifest";
import { findChromeImages, type ScrapedPage } from "../lib/legacy/map";
import { mapProductLayout } from "../lib/legacy/map-layout";

const DIR = path.join(import.meta.dirname, "..", "content", "legacy", "pages-products");
const pages = fs.readdirSync(DIR).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as ScrapedPage & { slug: string });
const ctx = { chromeImages: findChromeImages(pages) };

type Check = { row: number; slug: string; what: string; phrase?: RegExp; test?: (m: ReturnType<typeof map>, page: ScrapedPage) => boolean };
const map = (slug: string) => mapProductLayout(LEGACY_ENTRIES.find((e) => e.slug === slug)!, pages.find((p) => p.slug === slug)!, ctx);
const scrapeText = (p: ScrapedPage) => JSON.stringify(p.items.map((i) => ("text" in i ? i.text : "items" in i ? i.items : "url" in i ? i.url : "")));

const CHECKS: Check[] = [
  { row: 2, slug: "chem-screen", what: "text under the video (“Chem Screen are a solid based blend with 97% active chemical ingredients…”)", phrase: /solid based blend/i },
  { row: 7, slug: "osi-pmm-guardian", what: "“Safety install and pulling” section", phrase: /safety install/i },
  { row: 23, slug: "gas-release-system", what: "“Breaking the curve” block and its OD/ID/Dip tube/Length table", phrase: /breaking the curve/i },
  { row: 27, slug: "quick-release", what: "second video with “Before/After installation”", phrase: /before\s*\/?\s*after/i },
  { row: 29, slug: "surge-valve-packer-type-gas-separat", what: "“Hot Oil Injection”", phrase: /hot oil injection/i },
  { row: 34, slug: "hot-oil-tool", what: "text next to the video (QA wrote “Tear…”; Wix says “Treat more effectively, with greater efficiency…”)", phrase: /treat more effectively/i },
  { row: 40, slug: "the-nozzle", what: "“Mitigates the impact of bottom hole pressure in the upper chamber of the valve”", phrase: /mitigates the impact of bottom hole pressure/i },
  { row: 22, slug: "g-forcepackerless", what: "Benefits has 4 items (CMS had 9)", test: (m) => m.benefits.length === 4 },
  { row: 31, slug: "esp-chem-screen", what: "videos, How It Works content, PDF and 3D link", test: (m) => Boolean(m.videoUrl && m.brochurePdfUrl && m.model3dUrl) },
  { row: 32, slug: "well-shock-kits", what: "downloadable PDF and 3D link", test: (m) => Boolean(m.brochurePdfUrl && m.model3dUrl) },
  { row: 38, slug: "srp-sand-lift", what: "intro in 2 paragraphs and the video", test: (m) => (m.summary ?? "").split("\n\n").length === 2 && Boolean(m.videoUrl) },
  { row: 3, slug: "osi-chem-screen-gas-lift", what: "“Learn More About This Tool” with its text and files", phrase: /learn more about this tool/i },
  { row: 4, slug: "chem-sticks", what: "“Learn More About This Tool” with its text and files", phrase: /learn more about this tool/i },
  { row: 15, slug: "retrievable-chem-tool", what: "“Learn More About This Tool” with its text and files", phrase: /learn more about this tool/i },
];

const out = CHECKS.map((c) => {
  const page = pages.find((p) => p.slug === c.slug);
  if (!page) return { ...c, phrase: undefined, test: undefined, status: "no scrape", detail: "page not re-scraped" };
  const m = map(c.slug);
  const inScrape = c.phrase ? c.phrase.test(scrapeText(page)) : c.test!(m, page);
  const inLayout = c.phrase ? c.phrase.test(JSON.stringify(m.layout)) : inScrape;
  const files = page.items.filter((i) => i.type === "pdf").length;
  return {
    row: c.row,
    slug: c.slug,
    what: c.what,
    status: inScrape && inLayout ? "recovered" : inScrape ? "in scrape, not mapped" : "not in scrape",
    detail: `videos ${page.items.filter((i) => i.type === "video").length}, files ${files}, benefits ${m.benefits.length}, pdf ${Boolean(m.brochurePdfUrl)}, 3d ${Boolean(m.model3dUrl)}`,
  };
});

// Everything else: per product, what the page still lacks that the template shows a placeholder for.
const lacking = pages.map((p) => {
  const m = map(p.slug);
  return { slug: p.slug, missing: [!m.brochurePdfUrl && "PDF", !m.model3dUrl && "3D link", !m.videoUrl && "video", !m.benefits.length && "benefits", !m.summary && "intro text"].filter(Boolean) };
});
fs.mkdirSync(path.join(import.meta.dirname, "..", "docs", "qa"), { recursive: true });
fs.writeFileSync(path.join(import.meta.dirname, "..", "docs", "qa", "product-gaps.json"), JSON.stringify({ checks: out, lacking }, null, 1));
console.table(out.map(({ row, slug, status, detail }) => ({ row, slug, status, detail })));
console.log("products still lacking something:", lacking.filter((l) => l.missing.length).length, "of", lacking.length);
