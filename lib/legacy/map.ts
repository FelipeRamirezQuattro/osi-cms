/**
 * Pure mapping: batch-2 scraped JSON → CMS records. No I/O, no DB.
 * Never invents content: anything that doesn't fit cleanly goes to a
 * `flags` list the report surfaces.
 */
import type { ScrapedItem } from "./clean";
import { imageIdentity, wixOriginalUrl } from "./clean";
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

const text = (t: string, href?: string): Json =>
  href ? { type: "text", text: t, marks: [{ type: "link", attrs: { href } }] } : { type: "text", text: t };

/**
 * Wix draws a link as a separate element next to its label. Fold the pairs
 * back together so the label becomes a real link:
 *   paragraph "T" + link "T"        → paragraph "T" linking to the URL (OSI Papers)
 *   pdf + paragraph "label"         → paragraph "label" linking to the PDF (Wellbore Diagrams)
 *   pdf with its own text           → paragraph with that text linking to the PDF
 * Anything else is left exactly as scraped.
 */
export function foldLinks(items: ScrapedItem[]): ScrapedItem[] {
  const out: ScrapedItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const next = items[i + 1];
    if (it.type === "paragraph" && next?.type === "link" && next.text.trim().toLowerCase() === it.text.trim().toLowerCase()) {
      out.push({ type: "paragraph", text: it.text, href: next.url });
      i += 1;
    } else if (it.type === "pdf" && !it.text.trim() && next?.type === "paragraph" && next.text.length <= 120 && !next.href) {
      out.push({ type: "paragraph", text: next.text, href: it.url });
      i += 1;
    } else if (it.type === "pdf" && it.text.trim()) {
      out.push({ type: "paragraph", text: it.text.trim(), href: it.url });
    } else {
      out.push(it);
    }
  }
  return out;
}

/** Tiptap doc in the restricted shape components/blocks/rich-text.tsx reads. */
export function toRichTextDoc(items: ScrapedItem[]): { doc: Json; flags: string[] } | null {
  const content: Json[] = [];
  const flags: string[] = [];
  for (const item of items) {
    if (item.type === "heading") {
      content.push({ type: "heading", attrs: { level: item.level <= 2 ? 2 : 3 }, content: [text(item.text)] });
    } else if (item.type === "paragraph") {
      content.push({ type: "paragraph", content: [text(item.text, item.href)] });
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
export function altFor(items: ScrapedItem[], index: number, fallback: string): string {
  for (let i = index; i >= 0; i--) {
    const it = items[i];
    if (it.type === "heading" && !NAV_WORDS.test(it.text)) return it.text;
  }
  return fallback;
}

export const looksLikeFilename = (alt: string) => !alt || /\.(jpe?g|png|webp|gif|avif)$/i.test(alt);

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

  const items = foldLinks(page.items).filter((i) => i.type !== "image" || isContentImage(i, ctx));
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
      imageRun.push({ url: wixOriginalUrl(item.src), alt });
    } else if (item.type === "video") {
      flush();
      flushImages();
      blocks.push({ type: "video_embed", data: { background: "cream", videoUrl: item.url } });
    } else if (item.type === "pdf" || item.type === "link") {
      // PDFs and labelled links were folded into linked paragraphs above; anything left is surfaced in the report and resources.
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
  /** The manifest's URL-derived title — kept so the report can log every change. */
  manifestName: string;
  categorySlug: string | null;
  /** Intro paragraphs joined by a blank line; the template splits it back into paragraphs. */
  summary: string | null;
  diagramImageUrl: string | null;
  videoUrl: string | null;
  brochurePdfUrl: string | null;
  model3dUrl: string | null;
  benefits: { title: string }[];
  specs: { label: string; value: string; unit?: string }[];
  /** Everything that doesn't fit the fixed product structure, in page order (→ product_blocks). */
  blocks: BlockSeed[];
  imageAlts: { url: string; alt: string }[];
  externalLinks: string[];
  flags: string[];
  seoTitle: string;
  seoDescription: string | null;
}

const SECTION = {
  benefits: /^benefits?\b/i,
  how: /^how (it|does it) works?\b/i,
};

/** "ESP No- Go Catcher | odessaseparator" → the page's own title (nbsp and the site suffix removed). */
export const cleanProductName = (pageTitle: string) => cleanTitle(pageTitle.replace(/ /g, " ")).replace(/\s+/g, " ").trim();

/** Wix headings are ALL CAPS; show them in sentence case, leave mixed-case headings alone. */
export const sentenceCase = (t: string) => (t === t.toUpperCase() ? t.charAt(0) + t.slice(1).toLowerCase() : t);

const THREE_D_PROMPT = /^click here to see this tool in 3d$/i;
const MAX_CARD_ITEMS = 6; // benefits_cards schema limit

/** A short, unpunctuated paragraph followed by body text is a heading Wix styled as a paragraph ("Test Horizontal Well"). */
export function isPseudoHeading(item: ScrapedItem, next: ScrapedItem | undefined): boolean {
  if (item.type !== "paragraph" || next?.type !== "paragraph") return false;
  const words = item.text.trim().split(/\s+/).length;
  return words <= 6 && !/[.:;!?]$/.test(item.text.trim()) && next.text.length > item.text.length;
}

export function mapProduct(entry: LegacyEntry, page: ScrapedPage, ctx: MapContext): MappedProduct {
  const flags: string[] = [];
  const name = entry.name ?? (cleanProductName(page.title) || entry.title);
  if (name !== entry.title) flags.push("title_from_page");

  const noChrome = page.items.filter((i) => i.type !== "image" || isContentImage(i, ctx));
  const withoutH1 = noChrome.filter((i) => !(i.type === "heading" && i.level === 1));

  // The first content image is the product diagram (the hero's technical image).
  const diagramIdx = withoutH1.findIndex((i) => i.type === "image");
  const diagram = diagramIdx >= 0 ? (withoutH1[diagramIdx] as Extract<ScrapedItem, { type: "image" }>) : null;
  const rest = withoutH1.filter((_, i) => i !== diagramIdx);

  // Link labels Wix repeats as a paragraph ("Webinar" + a link "Webinar") and the 3D prompt are not body copy.
  const linkTexts = new Set(rest.flatMap((i) => (i.type === "link" ? [i.text.trim().toLowerCase()] : [])));
  const seq = rest.filter((i) => !(i.type === "paragraph" && linkTexts.has(i.text.trim().toLowerCase())));

  // Split into sections at every heading.
  type Section = { heading: string | null; kind: "intro" | "benefits" | "how" | "extra"; nodes: ScrapedItem[] };
  const sections: Section[] = [{ heading: null, kind: "intro", nodes: [] }];
  for (const it of seq) {
    if (it.type === "heading" && THREE_D_PROMPT.test(it.text)) {
      // Wix styles the "see this tool in 3D" prompt as a heading; it's the link's label, not a section.
      sections.push({ heading: null, kind: "how", nodes: [] });
    } else if (it.type === "heading") {
      const kind = SECTION.benefits.test(it.text) ? "benefits" : SECTION.how.test(it.text) ? "how" : "extra";
      sections.push({ heading: it.text, kind, nodes: [] });
    } else {
      sections[sections.length - 1].nodes.push(it);
    }
  }

  const intro: string[] = [];
  const howText: string[] = [];
  let benefitList: string[] | null = null;
  let videoUrl: string | null = null;
  let model3dUrl: string | null = null;
  const blocks: BlockSeed[] = [];
  const imageAlts: { url: string; alt: string }[] = [];
  const external: string[] = [];

  let text: ScrapedItem[] = [];
  let images: { url: string; alt: string }[] = [];
  const flushText = () => {
    const rt = toRichTextDoc(text);
    if (rt) {
      blocks.push({ type: "rich_text", data: { background: "cream", content: rt.doc } });
      flags.push(...rt.flags);
    }
    text = [];
  };
  const flushImages = () => {
    if (images.length === 1) {
      blocks.push({ type: "image", data: { background: "cream", imageUrl: images[0].url, alt: images[0].alt, decorative: false } });
    } else if (images.length > 1) {
      blocks.push({ type: "image_gallery", data: { background: "cream", images } });
    }
    images = [];
  };

  if (diagram) {
    const alt = looksLikeFilename(diagram.alt) ? altFor(noChrome, noChrome.indexOf(diagram), entry.title) : diagram.alt;
    if (alt !== diagram.alt) flags.push(PLACEHOLDER_ALT_FLAG);
    imageAlts.push({ url: wixOriginalUrl(diagram.src), alt });
  }

  for (const section of sections) {
    // A heading is only emitted when the section turns out to have body text.
    let pendingHeading: string | null =
      section.kind === "extra" || section.kind === "how" ? sentenceCase(section.heading ?? "") : null;
    const heading = pendingHeading;
    const sectionStart = blocks.length;
    const pushText = (item: ScrapedItem) => {
      if (pendingHeading) {
        text.push({ type: "heading", level: 2, text: pendingHeading });
        pendingHeading = null;
      }
      text.push(item);
    };

    section.nodes.forEach((node, idx) => {
      const next = section.nodes[idx + 1];
      switch (node.type) {
        case "paragraph": {
          if (section.kind === "intro") {
            intro.push(node.text);
          } else if (section.kind === "how") {
            // The "click here to see this tool in 3D" prompt is the link, not copy.
            if (!/^click here to see this tool in 3d$/i.test(node.text)) {
              howText.push(node.text);
              pushText(node);
            }
          } else if (isPseudoHeading(node, next)) {
            flushImages();
            pushText({ type: "heading", level: 3, text: node.text });
            flags.push("pseudo_heading_promoted");
          } else {
            flushImages();
            pushText(node);
          }
          break;
        }
        case "list": {
          if (!benefitList && (section.kind === "intro" || section.kind === "benefits")) {
            benefitList = node.items;
          } else if (heading && node.items.length <= MAX_CARD_ITEMS && !node.ordered) {
            flushText();
            flushImages();
            blocks.push({
              type: "benefits_cards",
              data: { background: "navy", title: heading, items: node.items.map((title) => ({ title })) },
            });
            pendingHeading = null;
          } else {
            flushImages();
            pushText(node);
            if (heading && node.items.length > MAX_CARD_ITEMS) flags.push("long_list_kept_as_bullets");
          }
          break;
        }
        case "table":
          flushImages();
          pushText(node);
          break;
        case "image": {
          flushText();
          const idxInRest = rest.indexOf(node);
          const alt = looksLikeFilename(node.alt) ? altFor(rest, idxInRest, entry.title) : node.alt;
          if (alt !== node.alt) flags.push(PLACEHOLDER_ALT_FLAG);
          const url = wixOriginalUrl(node.src);
          images.push({ url, alt });
          imageAlts.push({ url, alt });
          break;
        }
        case "video": {
          if (node.provider === "other") {
            flags.push("video_widget_skipped");
            break;
          }
          if (!videoUrl) {
            videoUrl = node.url;
          } else {
            flushText();
            flushImages();
            blocks.push({ type: "video_embed", data: { background: "cream", videoUrl: node.url } });
          }
          break;
        }
        case "link": {
          if (node.external) {
            external.push(node.url);
            if (!model3dUrl && (/worldcast/i.test(node.url) || /\b3d\b/i.test(node.text))) model3dUrl = node.url;
          }
          break;
        }
        default:
          break; // pdf items: handled via page.pdfs (resources + brochure)
      }
    });
    flushText();
    flushImages();
    // A heading whose section is only media (images/video) still labels that media — keep it.
    if (pendingHeading && blocks.length > sectionStart) {
      const headingDoc = toRichTextDoc([{ type: "heading", level: 2, text: pendingHeading }]);
      if (headingDoc) blocks.splice(sectionStart, 0, { type: "rich_text", data: { background: "cream", content: headingDoc.doc } });
    }
  }

  // Specs from any 2-column table rows (none in the current scrape; kept for pages that have them).
  const specs: MappedProduct["specs"] = [];
  for (const t of seq.filter((i) => i.type === "table")) {
    if (t.type !== "table") continue;
    for (const row of t.rows) {
      if (row.length === 2 && row[0] && row[1]) specs.push({ label: row[0], value: row[1] });
      else if (row.filter(Boolean).length) flags.push("spec_row_not_2_columns");
    }
  }

  // Defensive: a video the item walk didn't reach but the scrape listed.
  videoUrl ??= page.videos.find((v) => v.provider === "youtube" || v.provider === "wix")?.url ?? null;

  const summaryParas = intro.length ? intro : howText.length ? howText : [];
  const summary = summaryParas.join("\n\n") || null;
  if (!summary) flags.push("no_summary");
  const benefits = (benefitList ?? []).map((title) => ({ title }));
  if (!benefits.length) flags.push("no_benefits");
  if (howText.length && intro.length) flags.push("how_it_works_text_kept_as_block");
  if (model3dUrl) flags.push("has_3d_viewer_link");

  const group = entry.group;
  const categorySlug = GROUP_CATEGORY[group] ?? null;
  if (!categorySlug) flags.push("category_needs_review");

  // The product's own brochure: a PDF labelled like the product / "brochure" / "datasheet"; "case study" PDFs are resources only.
  const pdfs = page.pdfs.filter((p) => p.url.startsWith(LEGACY_BASE));
  const nameTokens = normalizeProductName(name);
  const brochure =
    pdfs.find((p) => normalizeProductName(p.text) === nameTokens && nameTokens) ??
    pdfs.find((p) => /brochure|data ?sheet|spec/i.test(p.text)) ??
    pdfs.find((p) => !/case study/i.test(p.text));

  return {
    slug: entry.slug!,
    name,
    manifestName: entry.title,
    categorySlug,
    summary,
    diagramImageUrl: diagram ? wixOriginalUrl(diagram.src) : null,
    videoUrl,
    brochurePdfUrl: brochure?.url ?? null,
    model3dUrl,
    benefits,
    specs,
    blocks,
    imageAlts,
    externalLinks: external,
    flags: [...new Set(flags)],
    seoTitle: cleanTitle(page.title) || name,
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
