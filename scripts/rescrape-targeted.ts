/**
 * Targeted, document-order re-scrape of a few live Wix pages whose first
 * scrape lost structure (QA, Oct 13): Inquiry Services (headings merged into
 * body text), Case Study (headings), and the batch-1 pages whose images were
 * never captured. Output: content/legacy/pages-targeted/<slug>.json — items
 * in the same ScrapedItem shape the batch-2 mapper reads, in DOM order, so
 * images land where they sit on the Wix page.
 *
 * Usage: pnpm exec tsx scripts/rescrape-targeted.ts [slug ...]   (default: all)
 * Read-only against the live site; writes only the JSON files.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { isChromeText, normalizeText, type ScrapedItem } from "../lib/legacy/clean";

const OUT = path.join(import.meta.dirname, "..", "content", "legacy", "pages-targeted");
const BASE = "https://www.odessaseparator.com";

/** slug → live path. Slugs are the CMS slugs the items will be applied to. */
const TARGETS: Record<string, string> = {
  "inquiry-services": "/inquiry-services-page",
  "case-study": "/case-study",
  "osi-papers": "/services-2",
  "services/machine-shop": "/machine-shop",
  hse: "/certifications",
  "careers/hiring": "/hiring",
  careers: "/careers",
  services: "/services-1",
  "terms-and-conditions": "/terms-and-conditions",
};

type Raw =
  | { t: "h"; level: number; text: string }
  | { t: "p"; text: string; href?: string }
  | { t: "li"; ordered: boolean; items: string[] }
  | { t: "img"; src: string; alt: string }
  | { t: "iframe"; src: string }
  | { t: "pdf"; url: string; text: string };

async function extract(page: import("@playwright/test").Page): Promise<Raw[]> {
  return page.evaluate(() => {
    const root = document.querySelector("#PAGES_CONTAINER") ?? document.body;
    const out: Raw[] = [];
    let numeral = "";
    // (No named inner functions here: tsx's __name helper doesn't exist in the browser.)
    const SKIP = "header, footer, nav, #SITE_HEADER, #SITE_FOOTER, [data-testid='cookie-banner']";
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    for (let n = walker.currentNode as Element | null; n; n = walker.nextNode() as Element | null) {
      if (!n || n.closest(SKIP)) continue;
      const tag = n.tagName.toLowerCase();
      const text = (n.textContent ?? "").replace(/\s+/g, " ").trim();
      if (/^h[1-6]$/.test(tag) && text) {
        out.push({ t: "h", level: Number(tag[1]), text: (numeral ? numeral + " " : "") + text });
        numeral = "";
      } else if (tag === "p" && text) {
        const a = n.querySelector("a[href]") as HTMLAnchorElement | null;
        out.push({ t: "p", text, href: a && a.textContent?.trim() === text ? a.href : undefined });
      } else if (tag === "span" && n.children.length === 0 && /^\d{1,2}\.$/.test(text)) {
        numeral = text; // big "01." numerals sit in their own span before the heading
      } else if ((tag === "ul" || tag === "ol") && !n.closest("li")) {
        const items = [...n.querySelectorAll(":scope > li")].map((li) => (li.textContent ?? "").replace(/\s+/g, " ").trim()).filter(Boolean);
        if (items.length) out.push({ t: "li", ordered: tag === "ol", items });
      } else if (tag === "img") {
        const img = n as HTMLImageElement;
        const src = img.currentSrc || img.src;
        if (src.includes("wixstatic.com/media")) out.push({ t: "img", src, alt: img.alt ?? "" });
      } else if (tag === "iframe") {
        out.push({ t: "iframe", src: (n as HTMLIFrameElement).src });
      } else if (tag === "a") {
        const href = (n as HTMLAnchorElement).href;
        if (/\.pdf($|\?)/i.test(href)) out.push({ t: "pdf", url: href, text });
      }
    }
    return out;
  });
}

function toItems(raw: Raw[]): ScrapedItem[] {
  const items: ScrapedItem[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    const key = JSON.stringify(r);
    if (seen.has(key) && r.t !== "img") continue;
    seen.add(key);
    if (r.t === "h") {
      const text = normalizeText(r.text);
      if (text && !isChromeText(text)) items.push({ type: "heading", level: r.level, text });
    } else if (r.t === "p") {
      const text = normalizeText(r.text);
      if (!text || isChromeText(text) || /^show (more|less)$/i.test(text)) continue;
      items.push({ type: "paragraph", text });
      if (r.href) items.push({ type: "link", url: r.href, text, external: !r.href.startsWith(BASE) });
    } else if (r.t === "li") {
      items.push({ type: "list", ordered: r.ordered, items: r.items.map(normalizeText).filter((t) => t && !isChromeText(t)) });
    } else if (r.t === "img") {
      items.push({ type: "image", src: r.src, alt: normalizeText(r.alt) });
    } else if (r.t === "iframe") {
      const yt = r.src.match(/youtube\.com\/embed\/[\w-]+/);
      if (yt) items.push({ type: "video", url: r.src, provider: "youtube" });
      // Anything else (e.g. dev-wix-languages.appspot.com widgets) renders "App Unavailable" on the live site itself.
    } else {
      items.push({ type: "pdf", url: r.url, text: normalizeText(r.text) });
    }
  }
  // A card grid is often present twice in the DOM (a combined list + its parts as headings/paragraphs):
  // drop a list whose every entry just restates a heading we already have.
  const headings = items.flatMap((i) => (i.type === "heading" ? [i.text.replace(/^\d{1,2}\.\s*/, "").toLowerCase()] : []));
  return items.filter(
    (i) => !(i.type === "list" && i.items.length > 0 && i.items.every((li) => headings.some((h) => h && li.toLowerCase().includes(h)))),
  );
}

async function main() {
  const wanted = process.argv.slice(2);
  const targets = Object.entries(TARGETS).filter(([slug]) => !wanted.length || wanted.includes(slug));
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const [slug, livePath] of targets) {
    await page.goto(BASE + livePath, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(9000); // Wix never reaches networkidle
    const items = toItems(await extract(page));
    const file = path.join(OUT, slug.replace(/\//g, "__") + ".json");
    fs.writeFileSync(file, JSON.stringify({ slug, url: BASE + livePath, scraped_at: new Date().toISOString(), items }, null, 2));
    const counts = items.reduce<Record<string, number>>((a, i) => ((a[i.type] = (a[i.type] ?? 0) + 1), a), {});
    console.log(slug.padEnd(24), JSON.stringify(counts));
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
