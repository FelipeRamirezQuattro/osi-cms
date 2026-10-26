/**
 * Visual-order re-scrape of every product page on the live Wix site
 * (QA Oct 21–24: the saved scrape is in DOM order, which Wix does not keep
 * in step with what a visitor sees — e.g. a "BENEFITS" heading after its
 * list). Elements are ordered by where they are RENDERED at 1440px: top
 * edge, with blocks that start on the same line ordered left to right.
 * Each item keeps its box (and an image its natural pixel size), so the
 * mapper can tell "video with its paragraph beside it" from "paragraph
 * under it" and W5 can report image sizes.
 *
 * Output: content/legacy/pages-products/<slug>.json (read-only against the
 * live site; writes only those files).
 *
 * Usage: pnpm exec tsx scripts/rescrape-products.ts [slug ...]   (default: all)
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { cleanItems, groupBullets, isTinyImage, stripAgentWidget, type ItemBox, type ScrapedItem } from "../lib/legacy/clean";
import { LEGACY_BASE, LEGACY_ENTRIES } from "../lib/legacy/batch2-manifest";

const OUT = path.join(import.meta.dirname, "..", "content", "legacy", "pages-products");
const UA = "OSI-CMS-migration/1.0 (content migration for odessaseparator.com; contact: site owner)";

/** The three products published from batch 1 are not in the batch-2 manifest. */
const EXTRA: { slug: string; path: string }[] = [
  { slug: "gas-release-system", path: "/gasreleasesystem" },
  { slug: "esp-chem-screen", path: "/esp-chem-screen-osi" },
  { slug: "srp-sand-lift", path: "/srp-sand-lift" },
];

type Raw = { item: ScrapedItem; box: ItemBox };

function extractInPage(): { raw: { item: unknown; box: { x: number; y: number; w: number; h: number } }[]; title: string; metaDescription: string | null } {
  const root =
    document.querySelector("main#PAGES_CONTAINER") ?? document.querySelector("#SITE_PAGES") ?? document.querySelector("main") ?? document.body;
  const visible = (el: Element) => (el as HTMLElement).checkVisibility?.({ checkOpacity: false, checkVisibilityCSS: true }) ?? true;
  const text = (el: Element) => (el as HTMLElement).innerText ?? el.textContent ?? "";
  const abs = (u: string) => new URL(u, location.href).href;
  const out: { item: unknown; box: { x: number; y: number; w: number; h: number } }[] = [];
  const claimed = new Set<Element>();
  const inClaimed = (el: Element) => {
    for (let p: Element | null = el; p; p = p.parentElement) if (claimed.has(p)) return true;
    return false;
  };
  const boxOf = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + scrollX), y: Math.round(r.top + scrollY), w: Math.round(r.width), h: Math.round(r.height) };
  };
  for (const el of root.querySelectorAll("h1,h2,h3,h4,h5,h6,p,ul,ol,table,img,iframe,video,a[href]")) {
    if (!visible(el) || inClaimed(el)) continue;
    const tag = el.tagName.toLowerCase();
    const box = boxOf(el);
    if (box.w === 0 || box.h === 0) continue;
    if (/^h[1-6]$/.test(tag)) out.push({ item: { type: "heading", level: Number(tag[1]), text: text(el) }, box });
    else if (tag === "p") out.push({ item: { type: "paragraph", text: text(el) }, box });
    else if (tag === "ul" || tag === "ol") {
      claimed.add(el);
      out.push({ item: { type: "list", ordered: tag === "ol", items: [...el.querySelectorAll(":scope > li")].map((li) => text(li)) }, box });
    } else if (tag === "table") {
      claimed.add(el);
      out.push({ item: { type: "table", rows: [...el.querySelectorAll("tr")].map((tr) => [...tr.querySelectorAll("th,td")].map((c) => text(c))) }, box });
    } else if (tag === "img") {
      const img = el as HTMLImageElement;
      if (!img.currentSrc && !img.src) continue;
      out.push({
        item: { type: "image", src: img.currentSrc || img.src, alt: img.alt, natural: { w: img.naturalWidth, h: img.naturalHeight } },
        box,
      });
    } else if (tag === "iframe" || tag === "video") {
      const src = (el as HTMLIFrameElement).src || (el as HTMLVideoElement).currentSrc || "";
      if (!src) continue;
      out.push({ item: { type: "video", url: src, provider: /youtube|youtu\.be/.test(src) ? "youtube" : /wix(static|video)/.test(src) ? "wix" : "other" }, box });
    } else if (tag === "a") {
      const href = (el as HTMLAnchorElement).getAttribute("href") ?? "";
      if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
      const url = abs(href);
      if (/\.pdf($|\?)/i.test(url) || url.includes("/_files/ugd/")) out.push({ item: { type: "pdf", url, text: text(el) }, box });
      else out.push({ item: { type: "link", url, text: text(el), external: new URL(url).host !== location.host }, box });
    }
  }
  return {
    raw: out,
    title: document.title,
    metaDescription: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null,
  };
}

/** Top edge first; blocks starting within 24px of each other are one line, ordered left to right. */
export function visualOrder(raw: Raw[]): Raw[] {
  const byTop = [...raw].sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x);
  const lines: Raw[][] = [];
  for (const r of byTop) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(r.box.y - line[0].box.y) <= 24) line.push(r);
    else lines.push([r]);
  }
  return lines.flatMap((l) => l.sort((a, b) => a.box.x - b.box.x));
}

async function main() {
  const wanted = process.argv.slice(2);
  const targets = [
    ...LEGACY_ENTRIES.filter((e) => e.target === "product" && e.slug && !e.duplicateOf).map((e) => ({ slug: e.slug!, path: e.path })),
    ...EXTRA,
  ].filter((t) => !wanted.length || wanted.includes(t.slug));
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA });
  await context.addInitScript("window.__name = (f) => f;");
  const page = await context.newPage();
  for (const [i, t] of targets.entries()) {
    try {
      const res = await page.goto(`${LEGACY_BASE}${t.path}`, { waitUntil: "load", timeout: 60_000 });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      if (!res || res.status() >= 400) throw new Error(`HTTP ${res?.status() ?? "none"}`);
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      const got = await page.evaluate(extractInPage);
      // Clean in DOM order first (the "contact the agent" widget is only contiguous there), then
      // order what is left by where it renders, then group "- " bullets (which needs visual order).
      const dom = got.raw.map((r) => ({ ...(r.item as ScrapedItem), box: r.box }));
      const cleaned = stripAgentWidget(cleanItems(dom).filter((x) => x.type !== "image" || !isTinyImage(x.src))).items;
      const items = groupBullets(visualOrder(cleaned.map((item) => ({ item, box: item.box! }))).map((r) => r.item));
      fs.writeFileSync(
        path.join(OUT, `${t.slug}.json`),
        JSON.stringify({ slug: t.slug, path: t.path, url: `${LEGACY_BASE}${t.path}`, title: got.title, meta_description: got.metaDescription, scraped_at: new Date().toISOString(), items }, null, 1),
      );
      console.log(`[${i + 1}/${targets.length}] ${t.slug} — ${items.length} items`);
    } catch (err) {
      console.warn(`[${i + 1}/${targets.length}] ${t.slug} FAILED: ${err instanceof Error ? err.message : err}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  await browser.close();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
