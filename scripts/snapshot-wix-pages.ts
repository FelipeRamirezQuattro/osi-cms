/**
 * Snapshots the rendered DOM of the 12 live Wix pages that the first page
 * import flattened (QA, 27 Oct / 1 Nov): About Us, Services (+3 subpages),
 * Careers, Hiring, HSE, SG-SST, Contact directory, Privacy, Terms.
 *
 * Why a DOM snapshot and not another JSON of headings/paragraphs: the first
 * two scrapes read `textContent` of each element, which glues adjacent
 * inline runs together, drops inline links, flattens lists and loses bold.
 * Here the browser only annotates the DOM (computed bold/italic, position,
 * background images, resolved image URLs) and writes it to disk; all
 * interpretation happens offline in lib/legacy/wix-dom.ts, which jsdom can
 * run in unit tests against these very files.
 *
 * Output: content/legacy/pages-dom/<slug>.html (+ a full-page Wix screenshot
 * in the directory given by --shots, for comparing against the CMS render).
 *
 * Usage: pnpm exec tsx scripts/snapshot-wix-pages.ts [--shots=<dir>] [slug ...]
 * Read-only against the live site.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

export const OUT = path.join(import.meta.dirname, "..", "content", "legacy", "pages-dom");
const BASE = "https://www.odessaseparator.com";

/** CMS slug → live Wix path. */
export const WIX_PAGES: Record<string, string> = {
  "about-us": "/about-us",
  services: "/services-1",
  "services/fluid-levels": "/general-8",
  "services/pump-cards": "/copia-de-fluid-levels",
  "services/machine-shop": "/machine-shop",
  careers: "/careers",
  "careers/hiring": "/hiring",
  hse: "/certifications",
  "hse/iso-45001": "/iso-45001",
  "hse/sg-sst-policies": "/sg-sst-policies",
  contact: "/osi-directory",
  "privacy-policy": "/privacy-policy",
  "terms-and-conditions": "/terms-and-conditions",
};

// Written as a string: tsx/esbuild injects a `__name` helper into function
// bodies that does not exist in the browser (same reason rescrape-targeted.ts
// avoids named inner functions).
const ANNOTATE = `(() => {
  const root = document.querySelector("#PAGES_CONTAINER") || document.body;
  const sx = window.scrollX, sy = window.scrollY;
  const all = root.querySelectorAll("*");
  for (const el of all) {
    const cs = getComputedStyle(el);
    const tag = el.tagName.toLowerCase();
    if (tag === "script" || tag === "style") continue;
    // Computed weight/style for anything that can carry text.
    el.setAttribute("data-fw", cs.fontWeight);
    el.setAttribute("data-fs", String(Math.round(parseFloat(cs.fontSize))));
    if (cs.fontStyle === "italic") el.setAttribute("data-fi", "1");
    if (cs.textDecorationLine && cs.textDecorationLine.indexOf("underline") >= 0) el.setAttribute("data-u", "1");
    const r = el.getBoundingClientRect();
    el.setAttribute("data-box", [r.left + sx, r.top + sy, r.width, r.height].map(Math.round).join(","));
    if (cs.display === "none" || cs.visibility === "hidden") el.setAttribute("data-hidden", "1");
    const bg = cs.backgroundImage;
    if (bg && bg !== "none") {
      const m = bg.match(/url\\(["']?([^"')]+)["']?\\)/);
      if (m) el.setAttribute("data-bg", m[1]);
    }
    if (tag === "img") el.setAttribute("src", el.currentSrc || el.src);
    // A pseudo-element can draw the bullet ("::before { content: '•' }").
    const pb = getComputedStyle(el, "::before").content;
    if (tag === "li" && pb && pb !== "none" && pb !== "normal") el.setAttribute("data-marker", pb.replace(/^["']|["']$/g, ""));
  }
  const clone = root.cloneNode(true);
  clone.querySelectorAll("script,style,svg,noscript,header,footer,#SITE_HEADER,#SITE_FOOTER,[data-testid='cookie-banner']").forEach((e) => e.remove());
  const walker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT);
  const comments = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) comments.push(n);
  comments.forEach((c) => c.remove());
  for (const el of clone.querySelectorAll("*")) {
    for (const a of [...el.attributes]) {
      if (!/^(href|src|alt|title|aria-label|role|target|data-fw|data-fs|data-fi|data-u|data-box|data-hidden|data-bg|data-marker|data-testid)$/.test(a.name)) el.removeAttribute(a.name);
    }
  }
  return clone.outerHTML.replace(/[ \\t\\r\\n]+/g, " ");
})()`;

async function autoScroll(page: import("@playwright/test").Page) {
  // Wix lazy-loads images and galleries; walk the page so they all resolve.
  await page.evaluate(`(async () => {
    const h = document.documentElement.scrollHeight;
    for (let y = 0; y < h; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 250)); }
    window.scrollTo(0, 0);
  })()`);
  await page.waitForTimeout(1500);
}

async function main() {
  const args = process.argv.slice(2);
  const shots = args.find((a) => a.startsWith("--shots="))?.slice(8);
  const wanted = args.filter((a) => !a.startsWith("--"));
  const targets = Object.entries(WIX_PAGES).filter(([slug]) => !wanted.length || wanted.includes(slug));
  fs.mkdirSync(OUT, { recursive: true });
  if (shots) fs.mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const [slug, livePath] of targets) {
    await page.goto(BASE + livePath, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(9000); // Wix never reaches networkidle
    await autoScroll(page);
    const html = (await page.evaluate(ANNOTATE)) as string;
    const file = path.join(OUT, slug.replace(/\//g, "__") + ".html");
    fs.writeFileSync(file, `<!-- ${BASE}${livePath} snapshot ${new Date().toISOString()} -->\n${html}\n`);
    if (shots) await page.screenshot({ path: path.join(shots, `wix-${slug.replace(/\//g, "__")}.png`), fullPage: true });
    console.log(slug.padEnd(24), `${(html.length / 1024).toFixed(0)} KB`);
  }
  await browser.close();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
