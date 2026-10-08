/**
 * Batch-2 legacy extraction (live site → content/legacy/pages-batch2/*.json).
 *
 * Wix renders client-side, so this drives Chromium at a 1440px desktop
 * viewport (the live site hides whole sections on mobile). Sequential,
 * one request every 2s, identifying User-Agent. Output keeps the batch-1
 * fields (headings/paragraphs/images/internal_links/raw_text) and adds
 * `items` (document-order content), so no two-pointer reconstruction is
 * needed for batch 2.
 *
 * Usage:
 *   pnpm scrape:batch2                 all importable entries
 *   pnpm scrape:batch2 --only=/gforce  one or more comma-separated paths
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { cleanPage, type ScrapedItem } from "../lib/legacy/clean";
import { LEGACY_BASE, scrapeTargets } from "../lib/legacy/batch2-manifest";

const OUT_DIR = path.join(import.meta.dirname, "..", "content", "legacy", "pages-batch2");
const DELAY_MS = 2000;
const UA = "OSI-CMS-migration/1.0 (content migration for odessaseparator.com; contact: site owner)";

const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");

/** Runs in the browser. Walks the main content in document order. */
function extractInPage(): { items: ScrapedItem[]; title: string; metaDescription: string | null; ogTitle: string | null } {
  const root =
    document.querySelector("main#PAGES_CONTAINER") ??
    document.querySelector("#SITE_PAGES") ??
    document.querySelector("main") ??
    document.body;
  const visible = (el: Element) =>
    (el as HTMLElement).checkVisibility?.({ checkOpacity: false, checkVisibilityCSS: true }) ?? true;
  const text = (el: Element) => (el as HTMLElement).innerText ?? el.textContent ?? "";
  const abs = (u: string) => new URL(u, location.href).href;

  const items: ScrapedItem[] = [];
  const claimed = new Set<Element>();
  const inClaimed = (el: Element) => {
    for (let p: Element | null = el; p; p = p.parentElement) if (claimed.has(p)) return true;
    return false;
  };

  const nodes = root.querySelectorAll("h1,h2,h3,h4,h5,h6,p,ul,ol,table,img,iframe,video,a[href]");
  for (const el of nodes) {
    if (!visible(el) || inClaimed(el)) continue;
    const tag = el.tagName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) {
      items.push({ type: "heading", level: Number(tag[1]), text: text(el) });
    } else if (tag === "p") {
      items.push({ type: "paragraph", text: text(el) });
    } else if (tag === "ul" || tag === "ol") {
      claimed.add(el);
      items.push({
        type: "list",
        ordered: tag === "ol",
        items: [...el.querySelectorAll(":scope > li")].map((li) => text(li)),
      });
    } else if (tag === "table") {
      claimed.add(el);
      items.push({
        type: "table",
        rows: [...el.querySelectorAll("tr")].map((tr) => [...tr.querySelectorAll("th,td")].map((c) => text(c))),
      });
    } else if (tag === "img") {
      const img = el as HTMLImageElement;
      if (!img.currentSrc && !img.src) continue;
      const fig = el.closest("figure");
      items.push({
        type: "image",
        src: img.currentSrc || img.src,
        alt: img.alt,
        caption: fig?.querySelector("figcaption")?.textContent ?? undefined,
      });
    } else if (tag === "iframe" || tag === "video") {
      const src = (el as HTMLIFrameElement).src || (el as HTMLVideoElement).currentSrc || "";
      if (!src) continue;
      items.push({
        type: "video",
        url: src,
        provider: /youtube|youtu\.be/.test(src) ? "youtube" : /wix(static|video)/.test(src) ? "wix" : "other",
      });
    } else if (tag === "a") {
      const href = (el as HTMLAnchorElement).getAttribute("href") ?? "";
      if (!href || href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
      const url = abs(href);
      if (/\.pdf($|\?)/i.test(url) || url.includes("/_files/ugd/")) {
        items.push({ type: "pdf", url, text: text(el) });
      } else {
        items.push({ type: "link", url, text: text(el), external: new URL(url).host !== location.host });
      }
    }
  }

  return {
    items,
    title: document.title,
    metaDescription: document.querySelector('meta[name="description"]')?.getAttribute("content") ?? null,
    ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute("content") ?? null,
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const targets = scrapeTargets().filter((t) => !only || only.includes(t.path));
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA });
  // tsx (esbuild keepNames) wraps nested functions in __name(); the helper
  // doesn't exist in the page, so shim it before any evaluate() runs.
  await context.addInitScript("window.__name = (f) => f;");
  const page = await context.newPage();
  const failures: { path: string; error: string }[] = [];

  for (const [i, entry] of targets.entries()) {
    const url = `${LEGACY_BASE}${entry.path}`;
    const file = path.join(OUT_DIR, `${entry.id}.json`);
    try {
      const res = await page.goto(url, { waitUntil: "load", timeout: 60_000 });
      // Wix keeps analytics connections open; cap the idle wait.
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);
      if (!res || res.status() >= 400) throw new Error(`HTTP ${res?.status() ?? "none"}`);
      // Trigger lazy content: scroll in steps to the bottom, then back.
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined);

      const raw = await page.evaluate(extractInPage);
      const { items, droppedWidget } = cleanPage(raw.items);
      const headings = items.filter((x) => x.type === "heading").map((h) => ({ level: `h${h.level}`, text: h.text }));
      const paragraphs = items.flatMap((x) => (x.type === "paragraph" ? [x.text] : x.type === "list" ? x.items.map((t) => `- ${t}`) : []));
      const images = items.flatMap((x) => (x.type === "image" ? [{ src: x.src, alt: x.alt, caption: x.caption ?? null }] : []));
      const out = {
        id: entry.id,
        url,
        title: raw.title,
        meta_description: raw.metaDescription,
        og_title: raw.ogTitle,
        scraped_at: new Date().toISOString(),
        headings,
        paragraphs,
        images,
        internal_links: items.flatMap((x) => (x.type === "link" && !x.external ? [x.url] : [])),
        external_links: items.flatMap((x) => (x.type === "link" && x.external ? [{ url: x.url, text: x.text }] : [])),
        videos: items.flatMap((x) => (x.type === "video" ? [{ url: x.url, provider: x.provider }] : [])),
        pdfs: items.flatMap((x) => (x.type === "pdf" ? [{ url: x.url, text: x.text }] : [])),
        tables: items.flatMap((x) => (x.type === "table" ? [x.rows] : [])),
        dropped_widget: droppedWidget,
        items,
        raw_text: items.flatMap((x) => (x.type === "heading" || x.type === "paragraph" ? [x.text] : x.type === "list" ? x.items : [])).join("\n"),
      };
      fs.writeFileSync(file, JSON.stringify(out, null, 2));
      console.log(`[${i + 1}/${targets.length}] ${entry.id} ${entry.path} — ${headings.length}h ${paragraphs.length}p ${images.length}img ${out.videos.length}vid ${out.tables.length}tbl ${out.pdfs.length}pdf`);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      failures.push({ path: entry.path, error });
      console.warn(`[${i + 1}/${targets.length}] ${entry.id} ${entry.path} — FAILED: ${error}`);
    }
    if (i < targets.length - 1) await sleep(DELAY_MS);
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, "_failures.json"), JSON.stringify(failures, null, 2));
  console.log(`Done. ${targets.length - failures.length} scraped, ${failures.length} failed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
