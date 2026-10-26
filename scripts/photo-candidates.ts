/**
 * Photo candidates for the Forge hero/card slots (W5), taken from the saved
 * scrape — no Wix editor paths. For every image already scraped it records
 * the ORIGINAL Wix URL (the /v1/fill|crop|fit/… transform stripped), its
 * original pixel size and the pages that use it, flags stock/non-OSI images,
 * ranks candidates per slot of docs/CONTENT-GAPS.md's photography table and
 * writes a LOCAL contact sheet (docs/qa/photo-candidates.html + .json).
 * Reads public image files only; uploads/publishes nothing.
 *
 * Usage: pnpm exec tsx scripts/photo-candidates.ts
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { imageIdentity, wixOriginalUrl } from "../lib/legacy/clean";
import { LEGACY_ENTRIES } from "../lib/legacy/batch2-manifest";

const ROOT = path.join(import.meta.dirname, "..");
const OUT = path.join(ROOT, "docs", "qa");
const DIRS = ["pages", "pages-batch2", "pages-targeted", "pages-products"].map((d) => path.join(ROOT, "content", "legacy", d));
const SIZE_CACHE = path.join(OUT, "photo-sizes.json");
/** Media-id prefix of the OSI Wix account's own uploads; anything else came from Wix's stock library. */
const OSI_PREFIX = "1ac9e9_";

interface Candidate {
  url: string;
  identity: string;
  alt: string[];
  pages: string[];
  w: number | null;
  h: number | null;
  stock: string | null;
  chrome: boolean;
}

const STOCK_ALT = /unsplash|pexels|shutterstock|istock|pixabay|freepik|getty|depositphotos|stock[-_ ]photo/i;

function collect(): Map<string, Candidate> {
  const found = new Map<string, Candidate>();
  const pageCount = new Set<string>();
  for (const dir of DIRS) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json") && !x.startsWith("_"))) {
      const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")) as { items?: { type: string; src?: string; alt?: string }[]; images?: { src: string; alt?: string }[] };
      const base = f.replace(/\.json$/, "");
      const entry = LEGACY_ENTRIES.find((e) => e.id === base);
      const page = entry ? `${entry.slug ?? entry.path.slice(1)}` : base;
      pageCount.add(page);
      const imgs = d.items ? d.items.filter((i) => i.type === "image" && i.src).map((i) => ({ src: i.src!, alt: i.alt ?? "" })) : (d.images ?? []).map((i) => ({ src: i.src, alt: i.alt ?? "" }));
      for (const i of imgs) {
        if (!/wixstatic\.com\/media\//.test(i.src)) continue;
        const identity = imageIdentity(i.src);
        const c = found.get(identity) ?? { url: wixOriginalUrl(i.src), identity, alt: [], pages: [], w: null, h: null, stock: null, chrome: false };
        if (i.alt && !c.alt.includes(i.alt)) c.alt.push(i.alt);
        if (!c.pages.includes(page)) c.pages.push(page);
        found.set(identity, c);
      }
    }
  }
  const threshold = Math.max(3, Math.ceil(pageCount.size * 0.3));
  for (const c of found.values()) {
    c.chrome = c.pages.length >= threshold;
    if (c.alt.some((a) => STOCK_ALT.test(a)) || STOCK_ALT.test(c.url)) c.stock = "stock-photo filename/alt";
    else if (!(c.url.split("/media/")[1] ?? "").startsWith(OSI_PREFIX)) c.stock = "unverified origin: not uploaded by the OSI Wix account (template/library/other-account file)";
  }
  return found;
}

async function sizes(cands: Candidate[]) {
  const cache: Record<string, { w: number; h: number } | null> = fs.existsSync(SIZE_CACHE) ? JSON.parse(fs.readFileSync(SIZE_CACHE, "utf8")) : {};
  const todo = cands.filter((c) => !(c.identity in cache));
  let next = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (next < todo.length) {
        const c = todo[next++];
        try {
          const res = await fetch(c.url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
          cache[c.identity] = meta.width && meta.height ? { w: meta.width, h: meta.height } : null;
        } catch {
          cache[c.identity] = null;
        }
      }
    }),
  );
  fs.writeFileSync(SIZE_CACHE, JSON.stringify(cache));
  for (const c of cands) {
    const s = cache[c.identity];
    c.w = s?.w ?? null;
    c.h = s?.h ?? null;
  }
}

interface Slot {
  key: string;
  label: string;
  w: number;
  h: number;
  /** Pages whose own images are the natural source (empty = every page). */
  from?: string[];
}
const SLOTS: Slot[] = [
  { key: "home-hero", label: "Home hero (hero_full)", w: 2400, h: 1350, from: ["home"] },
  { key: "full-bleed", label: "Other full-bleed heroes (hero_full on landing pages)", w: 2400, h: 1350 },
  { key: "page-hero", label: "Page hero image (hero_page)", w: 1600, h: 900 },
  { key: "product-hero", label: "Product hero diagram / photo (product_hero)", w: 1600, h: 1200 },
  { key: "split", label: "Story / split feature (split_feature)", w: 1200, h: 1500 },
  { key: "card", label: "Card images (feature_tiles, recommendations, related)", w: 1200, h: 750 },
  { key: "news-cover", label: "News / blog cover", w: 1600, h: 900 },
  { key: "news-featured", label: "Featured news cover", w: 2100, h: 900 },
];

function score(c: Candidate, s: Slot): number {
  if (!c.w || !c.h) return -1;
  const aspect = Math.abs(Math.log(c.w / c.h / (s.w / s.h)));
  const res = Math.min(1, c.w / s.w) * Math.min(1, c.h / s.h);
  return res * 2 - aspect;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const found = [...collect().values()];
  await sizes(found);
  const usable = found.filter((c) => !c.chrome && c.w && c.h && Math.min(c.w, c.h) >= 400);
  const ranked = SLOTS.map((s) => {
    const pool = usable.filter((c) => !s.from || c.pages.some((p) => s.from!.includes(p)));
    const all = pool.map((c) => ({ c, score: score(c, s) })).sort((a, b) => b.score - a.score);
    return { slot: s, top: all.filter((x) => !x.c.stock).slice(0, 8), flagged: all.filter((x) => x.c.stock).slice(0, 6) };
  });
  // Page-level slots (page hero, news cover): each non-product page's own best images.
  const pageHero = SLOTS.find((x) => x.key === "page-hero")!;
  const productSlugs = new Set(fs.existsSync(DIRS[3]) ? fs.readdirSync(DIRS[3]).map((f) => f.replace(/\.json$/, "")) : []);
  const pageNames = [...new Set(usable.flatMap((c) => c.pages))].filter((n) => !productSlugs.has(n)).sort();
  const perPage = pageNames
    .map((name) => ({
      page: name,
      top: usable
        .filter((c) => c.pages.includes(name) && !c.stock)
        .map((c) => ({ c, score: score(c, pageHero) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3),
      stock: usable.filter((c) => c.pages.includes(name) && c.stock),
    }))
    .filter((p) => p.top.length || p.stock.length);
  fs.writeFileSync(path.join(OUT, "photo-candidates.json"), JSON.stringify({ generated_at: new Date().toISOString(), total: found.length, stock: found.filter((c) => c.stock), ranked, perPage }, null, 1));

  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const card = (c: Candidate, s: Slot) => `<figure class="${c.stock ? "stock" : ""}"><img loading=lazy src="${esc(c.url)}" alt="">
<figcaption><b>${c.w}×${c.h}</b> · ${(c.w! / c.h!).toFixed(2)}:1 · ${c.w! >= s.w ? "meets" : `${Math.round((c.w! / s.w) * 100)}% of`} ${s.w}px<br>
${c.stock ? `<span class=flag>${c.stock.startsWith("stock") ? "STOCK — do not use" : "Verify before use"}: ${esc(c.stock)}</span><br>` : ""}pages: ${esc(c.pages.slice(0, 4).join(", "))}${c.pages.length > 4 ? ` +${c.pages.length - 4}` : ""}<br>
<a href="${esc(c.url)}">${esc(c.url)}</a></figcaption></figure>`;
  const sections = ranked
    .map(({ slot, top, flagged }) => `<section><h2>${esc(slot.label)} <small>${slot.w}×${slot.h}</small></h2><div class=grid>${top.map((x) => card(x.c, slot)).join("")}</div>${flagged.length ? `<h3>Stock or unverified origin — do not use unless confirmed OSI's</h3><div class=grid>${flagged.map((x) => card(x.c, slot)).join("")}</div>` : ""}</section>`)
    .join("\n");
  const pageSections = perPage
    .map((p) => `<section><h2>Page: ${esc(p.page)} <small>page hero ${pageHero.w}×${pageHero.h}</small></h2><div class=grid>${p.top.map((x) => card(x.c, pageHero)).join("")}${p.stock.map((c) => card(c, pageHero)).join("")}</div></section>`)
    .join("\n");
  const stockAll = found.filter((c) => c.stock);
  fs.writeFileSync(
    path.join(OUT, "photo-candidates.html"),
    `<!doctype html><meta charset=utf-8><title>Photo candidates</title><style>body{font:13px system-ui;margin:20px;background:#fafafa}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}figure{margin:0;background:#fff;border:1px solid #ccc;padding:6px}figure img{width:100%;height:170px;object-fit:contain;background:#eee}figcaption{font-size:11px;word-break:break-all}.stock{border-color:#c00;background:#fff4f4}.flag{color:#c00;font-weight:600}</style>
<h1>Photo candidates (local only — not for upload)</h1><p>${found.length} images scraped; ${stockAll.length} flagged (stock, or origin unverified). Original Wix URLs (transform stripped).</p>${sections}<h1>Per page (page hero / cover candidates from the page\'s own images)</h1>${pageSections}`,
  );
  console.log(JSON.stringify({ images: found.length, usable: usable.length, stock: stockAll.length, top: ranked.map((r) => ({ slot: r.slot.key, top: r.top[0]?.c.url, size: r.top[0] ? `${r.top[0].c.w}x${r.top[0].c.h}` : null })) }, null, 1));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
