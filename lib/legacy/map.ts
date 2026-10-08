/**
 * Pure mapping: batch-2 scraped JSON → CMS records. No I/O, no DB.
 * Never invents content: anything that doesn't fit cleanly goes to a
 * `flags` list the report surfaces.
 */
import type { ScrapedItem } from "./clean";
import { imageIdentity } from "./clean";
import { GROUP_CATEGORY, LEGACY_BASE, type LegacyEntry } from "./batch2-manifest";

export interface ScrapedPage {
  id: string;
  url: string;
  title: string;
  meta_description: string | null;
  items: ScrapedItem[];
  pdfs: { url: string; text: string }[];
  videos: { url: string; provider: string }[];
}

export type Json = string | number | boolean | null | { [k: string]: Json } | Json[];
export interface BlockSeed {
  type: string;
  data: Record<string, Json>;
}

export interface MapContext {
  /** Image identities that appear on many pages (footer seals etc.). */
  chromeImages: Set<string>;
}

export const PLACEHOLDER_ALT_FLAG = "alt_needs_review";

/** Images repeated across >30% of scraped pages are site chrome, not content. */
export function findChromeImages(pages: ScrapedPage[], threshold = 0.3): Set<string> {
  const counts = new Map<string, number>();
  for (const p of pages) {
    const seen = new Set(p.items.flatMap((i) => (i.type === "image" ? [imageIdentity(i.src)] : [])));
    for (const id of seen) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  const min = Math.max(3, Math.ceil(pages.length * threshold));
  return new Set([...counts].filter(([, n]) => n >= min).map(([id]) => id));
}

const isContentImage = (i: ScrapedItem, ctx: MapContext) =>
  i.type === "image" && !ctx.chromeImages.has(imageIdentity(i.src));

// ---------- rich text ----------

const text = (t: string): Json => ({ type: "text", text: t });

/** Tiptap doc in the restricted shape components/blocks/rich-text.tsx reads. */
export function toRichTextDoc(items: ScrapedItem[]): { doc: Json; flags: string[] } | null {
  const content: Json[] = [];
  const flags: string[] = [];
  for (const item of items) {
    if (item.type === "heading") {
      content.push({ type: "heading", attrs: { level: item.level <= 2 ? 2 : 3 }, content: [text(item.text)] });
    } else if (item.type === "paragraph") {
      content.push({ type: "paragraph", content: [text(item.text)] });
    } else if (item.type === "list") {
      content.push({
        type: item.ordered ? "orderedList" : "bulletList",
        content: item.items.map((t) => ({ type: "listItem", content: [{ type: "paragraph", content: [text(t)] }] })),
      });
    } else if (item.type === "table") {
      // The restricted reader has no table node; keep the data as list rows and flag it.
      flags.push("table_flattened_to_list");
      content.push({
        type: "bulletList",
        content: item.rows.map((r) => ({
          type: "listItem",
          content: [{ type: "paragraph", content: [text(r.filter(Boolean).join(" — "))] }],
        })),
      });
    }
  }
  return content.length ? { doc: { type: "doc", content }, flags } : null;
}

// ---------- pages ----------

const NAV_WORDS = /^(home|products?)$/i;

/** Nearest preceding heading, used as alt text when the source has none. */
function altFor(items: ScrapedItem[], index: number, fallback: string): string {
  for (let i = index; i >= 0; i--) {
    const it = items[i];
    if (it.type === "heading" && !NAV_WORDS.test(it.text)) return it.text;
  }
  return fallback;
}

const looksLikeFilename = (alt: string) => !alt || /\.(jpe?g|png|webp|gif|avif)$/i.test(alt);

export interface MappedPage {
  slug: string;
  title: string;
  template: "standard";
  seoTitle: string;
  seoDescription: string | null;
  blocks: BlockSeed[];
  flags: string[];
  language?: "es";
  formFields: string[];
}

/** Scraped titles look like "Super Perf | odessaseparator". */
export const cleanTitle = (t: string) => t.replace(/\s*\|\s*odessaseparator\s*$/i, "").trim();

export function mapPage(entry: LegacyEntry, page: ScrapedPage, ctx: MapContext): MappedPage {
  const flags: string[] = [];
  const blocks: BlockSeed[] = [];
  const title = entry.title;
  blocks.push({ type: "hero_page", data: { background: "navy", title } });

  const items = page.items.filter((i) => i.type !== "image" || isContentImage(i, ctx));
  // Heading equal to the page title duplicates the hero; drop the first such.
  const firstH1 = items.findIndex((i) => i.type === "heading" && i.level === 1);
  if (firstH1 >= 0) items.splice(firstH1, 1);

  let buffer: ScrapedItem[] = [];
  const flush = () => {
    const rt = toRichTextDoc(buffer);
    if (rt) {
      blocks.push({ type: "rich_text", data: { background: "cream", content: rt.doc } });
      flags.push(...rt.flags);
    }
    buffer = [];
  };
  const imageRun: { url: string; alt: string }[] = [];
  const flushImages = () => {
    if (imageRun.length === 1) {
      blocks.push({
        type: "image",
        data: { background: "cream", imageUrl: imageRun[0].url, alt: imageRun[0].alt, decorative: false },
      });
    } else if (imageRun.length > 1) {
      blocks.push({ type: "image_gallery", data: { background: "cream", images: imageRun.map((i) => ({ url: i.url, alt: i.alt })) } });
    }
    imageRun.length = 0;
  };

  items.forEach((item, idx) => {
    if (item.type === "image") {
      flush();
      const alt = looksLikeFilename(item.alt) ? altFor(items, idx, title) : item.alt;
      if (alt !== item.alt) flags.push(PLACEHOLDER_ALT_FLAG);
      imageRun.push({ url: item.src, alt });
    } else if (item.type === "video") {
      flush();
      flushImages();
      blocks.push({ type: "video_embed", data: { background: "cream", videoUrl: item.url } });
    } else if (item.type === "pdf" || item.type === "link") {
      // Links/PDFs are surfaced in the report and resources, not inlined.
    } else {
      flushImages();
      buffer.push(item);
    }
  });
  flush();
  flushImages();

  if (blocks.length === 1) flags.push("no_body_content");
  if (page.pdfs.length) flags.push(`pdfs:${page.pdfs.length}`);

  return {
    slug: entry.slug!,
    title,
    template: "standard",
    seoTitle: cleanTitle(page.title) || title,
    seoDescription: page.meta_description,
    blocks,
    flags: [...new Set(flags)],
    language: entry.language,
    formFields: detectFormFields(page.items),
  };
}

/** Event pages that are mainly a form: list the field labels, never build the form. */
export function detectFormFields(items: ScrapedItem[]): string[] {
  const out: string[] = [];
  for (const it of items) {
    if (it.type !== "paragraph") continue;
    if (/^(full |first |last )?name\*?$|^e-?mail\*?$|^phone\*?$|^company\*?$|^(job )?title\*?$|\*$/i.test(it.text) && it.text.length < 40) {
      out.push(it.text.replace(/\*$/, "").trim());
    }
  }
  return [...new Set(out)];
}

// ---------- products ----------

export interface MappedProduct {
  slug: string;
  name: string;
  categorySlug: string | null;
  summary: string | null;
  diagramImageUrl: string | null;
  videoUrl: string | null;
  brochurePdfUrl: string | null;
  benefits: { title: string }[];
  specs: { label: string; value: string; unit?: string }[];
  imageAlts: { url: string; alt: string }[];
  externalLinks: string[];
  flags: string[];
  seoTitle: string;
  seoDescription: string | null;
}

const SECTION = {
  benefits: /^benefits?$/i,
  how: /^how (it|does it) works?\??$/i,
};

export function mapProduct(entry: LegacyEntry, page: ScrapedPage, ctx: MapContext): MappedProduct {
  const flags: string[] = [];
  const items = page.items;

  const benefitsIdx = items.findIndex((i) => i.type === "heading" && SECTION.benefits.test(i.text));
  const howIdx = items.findIndex((i) => i.type === "heading" && SECTION.how.test(i.text));

  // Intro = paragraphs before the BENEFITS heading, in order.
  const introEnd = benefitsIdx >= 0 ? benefitsIdx : items.length;
  const intro = items
    .slice(0, introEnd)
    .flatMap((i) => (i.type === "paragraph" ? [i.text] : []));
  const howText =
    howIdx >= 0
      ? items
          .slice(howIdx + 1)
          .filter((i) => i.type === "paragraph")
          .flatMap((i) => (i.type === "paragraph" ? [i.text] : []))
          .filter((t) => !/^click here to see this tool in 3d$/i.test(t))
      : [];

  // Benefits are the bullet list(s) before BENEFITS (Wix renders them above the heading) or after it.
  const benefitLists = items.filter((i) => i.type === "list").slice(0, 2);
  const benefits = benefitLists.flatMap((l) => (l.type === "list" ? l.items.map((title) => ({ title })) : []));
  if (benefitLists.length > 1) flags.push("multiple_lists_check_benefits");

  // Spec tables: 2+ column rows become label/value; anything wider is flagged and skipped.
  const specs: MappedProduct["specs"] = [];
  for (const t of items.filter((i) => i.type === "table")) {
    if (t.type !== "table") continue;
    for (const row of t.rows) {
      if (row.length === 2 && row[0] && row[1]) specs.push({ label: row[0], value: row[1] });
      else if (row.filter(Boolean).length) flags.push("spec_row_not_2_columns");
    }
  }

  const contentImages = items.filter((i): i is Extract<ScrapedItem, { type: "image" }> => isContentImage(i, ctx));
  const diagram = contentImages[0];
  const imageAlts = contentImages.map((img) => {
    const idx = items.indexOf(img);
    const alt = looksLikeFilename(img.alt) ? altFor(items, idx, entry.title) : img.alt;
    if (alt !== img.alt) flags.push(PLACEHOLDER_ALT_FLAG);
    return { url: img.src, alt };
  });

  const summary = [...intro, ...(howText.length && !intro.length ? howText : [])].join("\n\n") || null;
  if (!summary) flags.push("no_summary");
  if (!benefits.length) flags.push("no_benefits");
  if (howText.length && intro.length) flags.push("how_it_works_text_not_stored");

  const external = items.flatMap((i) => (i.type === "link" && i.external ? [i.url] : []));
  if (external.some((u) => /worldcast/.test(u))) flags.push("has_3d_viewer_link");

  const group = entry.group;
  const categorySlug = GROUP_CATEGORY[group] ?? null;
  if (!categorySlug) flags.push("category_needs_review");

  return {
    slug: entry.slug!,
    name: entry.title,
    categorySlug,
    summary,
    diagramImageUrl: diagram?.src ?? null,
    videoUrl: page.videos.find((v) => v.provider === "youtube" || v.provider === "wix")?.url ?? null,
    brochurePdfUrl: page.pdfs.find((p) => p.url.startsWith(LEGACY_BASE))?.url ?? null,
    benefits,
    specs,
    imageAlts,
    externalLinks: external,
    flags: [...new Set(flags)],
    seoTitle: cleanTitle(page.title) || entry.title,
    seoDescription: page.meta_description,
  };
}

// ---------- blog ----------

export interface MappedBlogPost {
  slug: string;
  title: string;
  excerpt: string | null;
  body: Json;
  coverImageUrl: string | null;
  publishedAt: string | null;
  flags: string[];
}

const NUMERIC_DATE_RE = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/;
const parseDate = (t: string): number => {
  const n = t.match(NUMERIC_DATE_RE);
  if (n) return Date.UTC(Number(n[3]), Number(n[1]) - 1, Number(n[2]));
  const w = t.match(DATE_RE);
  return w ? Date.parse(w[0].replace(/\./g, "")) : NaN;
};
const DATE_RE = /\b(?:(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})\b/i;

export function mapBlogPost(entry: LegacyEntry, page: ScrapedPage, ctx: MapContext): MappedBlogPost {
  const flags: string[] = [];
  const body = toRichTextDoc(page.items.filter((i) => i.type !== "image" && !(i.type === "heading" && i.level === 1)));
  const dateText = page.items.flatMap((i) => (i.type === "paragraph" ? [i.text] : [])).find((t) => DATE_RE.test(t) || NUMERIC_DATE_RE.test(t));
  const parsed = dateText ? parseDate(dateText) : NaN;
  if (Number.isNaN(parsed)) flags.push("no_publish_date_found");
  const cover = page.items.find((i) => isContentImage(i, ctx));
  const firstPara = page.items.find((i) => i.type === "paragraph" && !DATE_RE.test(i.text));
  if (!body) flags.push("no_body_content");
  return {
    slug: entry.slug!,
    title: entry.title,
    excerpt: firstPara?.type === "paragraph" ? firstPara.text.slice(0, 280) : null,
    body: body?.doc ?? { type: "doc", content: [] },
    coverImageUrl: cover?.type === "image" ? cover.src : null,
    publishedAt: Number.isNaN(parsed) ? null : new Date(parsed).toISOString(),
    flags,
  };
}

// ---------- duplicates & product matching ----------

const tokens = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);

/** Jaccard similarity of word sets, 0..1. */
export function textSimilarity(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (!A.size && !B.size) return 1;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  return inter / (A.size + B.size - inter);
}

export const pageText = (p: ScrapedPage) =>
  p.items.flatMap((i) => (i.type === "heading" || i.type === "paragraph" ? [i.text] : i.type === "list" ? i.items : [])).join(" ");

/** Case-insensitive, ignoring "osi"/"esp" prefixes and punctuation. */
export function normalizeProductName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && w !== "osi" && w !== "esp")
    .join(" ");
}

export interface ProductMatch {
  confidence: "exact" | "high" | "none";
  slug?: string;
}

export function matchExistingProduct(name: string, slug: string, existing: { slug: string; name: string }[]): ProductMatch {
  const n = normalizeProductName(name);
  const s = normalizeProductName(slug.replace(/-/g, " "));
  for (const e of existing) {
    if (e.slug === slug) return { confidence: "exact", slug: e.slug };
    const en = normalizeProductName(e.name);
    if (en === n || en === s) return { confidence: "high", slug: e.slug };
  }
  return { confidence: "none" };
}
