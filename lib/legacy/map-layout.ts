/**
 * Pure mapping: a product page's visual-order scrape
 * (content/legacy/pages-products, see scripts/rescrape-products.ts) → the
 * product's ordered layout (migration-free: rows for `product_blocks`).
 *
 * Every section is emitted in the order a visitor sees it on the Wix page,
 * with Wix's own heading text. The product's fixed data (benefits, specs,
 * video, PDF, 3D link, summary) is still returned as fields; the layout rows
 * that stand for them are the "linked" sections of lib/products/layout.ts.
 * Never invents content: whatever does not map cleanly is flagged.
 */
import type { ItemBox, ScrapedItem } from "./clean";
import { wixOriginalUrl } from "./clean";
import { GROUP_CATEGORY, LEGACY_BASE, type LegacyEntry } from "./batch2-manifest";
import {
  PLACEHOLDER_ALT_FLAG,
  altFor,
  cleanProductName,
  cleanTitle,
  isPseudoHeading,
  looksLikeFilename,
  normalizeProductName,
  toRichTextDoc,
  type BlockSeed,
  type Json,
  type MapContext,
} from "./map";
import { imageIdentity } from "./clean";
import { LINKED_SECTION_TYPES, LINKED_SECTIONS, type LinkedSectionType } from "../products/layout";

export interface LayoutSeed extends BlockSeed {
  is_visible: boolean;
}

export interface LayoutPage {
  slug: string;
  title: string;
  meta_description: string | null;
  items: ScrapedItem[];
}

export interface MappedProductLayout {
  slug: string;
  name: string;
  categorySlug: string | null;
  summary: string | null;
  diagramImageUrl: string | null;
  videoUrl: string | null;
  brochurePdfUrl: string | null;
  model3dUrl: string | null;
  benefits: { title: string; body?: string }[];
  specs: { label: string; value: string; unit?: string }[];
  /** Linked sections and extra blocks, in page order. Every linked section appears exactly once. */
  layout: LayoutSeed[];
  imageAlts: { url: string; alt: string }[];
  flags: string[];
  seoTitle: string;
  seoDescription: string | null;
}

type Item = ScrapedItem;

const THREE_D_PROMPT = /^(click here( to see)?|this tool in 3d|click here to see this tool in 3d|see this tool in 3d)$/i;
const PDF_LABEL = /^(download( the)? (pdf|brochure|datasheet)|click here to download)$/i;
const STRAY_FRAGMENT = /^(tm|™|®|sm)$/i;
const BENEFIT_HEADING = /benefit/i;
const SPEC_HEADING = /^(consideration|specification|spec\b|technical data)/i;
const LEARN_MORE = /^learn more\b/i;
const LIST_HEADING = /advantage|feature|key |highlight/i;
const MAX_CARD_ITEMS = 6;
const MAX_BENEFITS = 13;

const area = (b: ItemBox) => b.w * b.h;
const centre = (b: ItemBox) => ({ x: b.x + b.w / 2, y: b.y + b.h / 2 });
const inside = (inner: ItemBox, outer: ItemBox) => {
  const c = centre(inner);
  return c.x >= outer.x && c.x <= outer.x + outer.w && c.y >= outer.y && c.y <= outer.y + outer.h;
};
const verticalOverlap = (a: ItemBox, b: ItemBox) => {
  const top = Math.max(a.y, b.y);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  return Math.max(0, bottom - top) / Math.max(1, Math.min(a.h, b.h));
};
const horizontalOverlap = (a: ItemBox, b: ItemBox) => {
  const left = Math.max(a.x, b.x);
  const right = Math.min(a.x + a.w, b.x + b.w);
  return Math.max(0, right - left) / Math.max(1, Math.min(a.w, b.w));
};

/** Acronyms Wix headings use that must survive sentence-casing an ALL-CAPS heading. */
const KEEP_CAPS = /^(OSI|ESP|SRP|PDF|GRS|GLR|GOR|TAC|PMM|PTGS|HSE|OD|ID|UV|API|BHA|PSI|3D|TM|II|III|IV)$/;

/** Wix headings are typed in capitals; show them in sentence case (acronyms kept), mixed-case headings untouched. */
export function headingText(raw: string): string {
  const t = raw.replace(/\s+/g, " ").trim();
  if (t !== t.toUpperCase()) return t;
  return t
    .split(" ")
    .map((w, i) => (KEEP_CAPS.test(w.replace(/[^A-Za-z0-9]/g, "")) || /\d/.test(w) ? w : i === 0 ? w.charAt(0) + w.slice(1).toLowerCase() : w.toLowerCase()))
    .join(" ");
}

const clean = (t: string) => t.replace(/\s+/g, " ").trim();

/** Removes a stray "TM" token Wix draws as a superscript beside a name ("TM Benefits"). */
const stripStray = (t: string) => clean(t.replace(/(^|\s)(TM|™)(?=\s|$)/g, " "));

function isContentImage(i: Item, ctx: MapContext): i is Extract<Item, { type: "image" }> {
  return i.type === "image" && !ctx.chromeImages.has(imageIdentity(i.src));
}


const LABEL_WORD = /^(benefits?|advantages|features|key features|specifications?|sizes|how it works)$/i;
const TITLE_BODY = /^[^:.]{3,45}:\s+\S/;

function promoteLabels(items: Item[], flags: string[]): Item[] {
  const out: Item[] = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (it.type === "paragraph" && LABEL_WORD.test(clean(it.text)) && !it.href) {
      out.push({ type: "heading", level: 2, text: clean(it.text), ...(it.box ? { box: it.box } : {}) });
      flags.push("label_promoted_to_heading");
      // "Title: body" paragraphs straight after a benefits-style heading are the list.
      if (BENEFIT_HEADING.test(it.text) || LIST_HEADING.test(it.text)) {
        const run: Extract<Item, { type: "paragraph" }>[] = [];
        for (let j = i + 1; items[j]?.type === "paragraph" && TITLE_BODY.test(clean((items[j] as Extract<Item, { type: "paragraph" }>).text)); j++) run.push(items[j] as Extract<Item, { type: "paragraph" }>);
        if (run.length >= 3) {
          out.push({ type: "list", ordered: false, items: run.map((r) => clean(r.text)), ...(run[0].box ? { box: run[0].box } : {}) });
          i += run.length;
          flags.push("paragraphs_grouped_as_list");
        }
      }
    } else out.push(it);
  }
  return out;
}

/** Wix wraps a sentence into one paragraph per line: join a line with no end punctuation to a lowercase line right under it. */
function joinWrappedLines(items: Item[]): Item[] {
  const out: Item[] = [];
  for (const it of items) {
    // Links/PDF icons are drawn between lines of text; look past them for the line above.
    let pi = out.length - 1;
    while (pi >= 0 && (out[pi].type === "pdf" || out[pi].type === "link")) pi--;
    const prev = out[pi];
    const lastItem = prev?.type === "list" ? prev.items[prev.items.length - 1] : "";
    if (
      it.type === "paragraph" && prev?.type === "list" && !prev.ordered && it.box && prev.box && !it.href &&
      lastItem && !/[.!?:]$/.test(clean(lastItem)) && clean(it.text).split(" ").length <= 4 &&
      it.box.y - (prev.box.y + prev.box.h) <= 12 && it.box.y >= prev.box.y
    ) {
      // A wrapped bullet: its last words sit under the list as a paragraph.
      out[pi] = { ...prev, items: [...prev.items.slice(0, -1), `${clean(lastItem)} ${clean(it.text)}`], box: { ...prev.box, h: it.box.y + it.box.h - prev.box.y } };
    } else if (
      it.type === "list" && prev?.type === "list" && !it.ordered && !prev.ordered && it.box && prev.box &&
      it.box.y - (prev.box.y + prev.box.h) <= 12 && Math.abs(it.box.x - prev.box.x) <= 12
    ) {
      // One bulleted list Wix drew as two text boxes.
      out[pi] = { ...prev, items: [...prev.items, ...it.items], box: { ...prev.box, h: it.box.y + it.box.h - prev.box.y } };
    } else if (
      it.type === "paragraph" && prev?.type === "paragraph" && it.box && prev.box && !it.href && !prev.href &&
      !/[.!?:”"]$/.test(clean(prev.text)) && /^[a-z(]/.test(clean(it.text)) &&
      it.box.y - (prev.box.y + prev.box.h) <= 12 && it.box.y >= prev.box.y && horizontalOverlap(prev.box, it.box) > 0.5
    ) {
      out[pi] = { ...prev, text: `${clean(prev.text)} ${clean(it.text)}`, box: { ...prev.box, h: it.box.y + it.box.h - prev.box.y } };
    } else out.push(it);
  }
  return out;
}

function foldLinkedLabels(items: Item[], brochureUrl: string | undefined): Item[] {
  const drop = new Set<number>();
  const same = (a: string, b: string) => clean(a).toLowerCase() === clean(b).toLowerCase();
  const out = items.map((it) => ({ ...it })) as Item[];
  out.forEach((it, i) => {
    const near = (pred: (x: Item) => boolean) => [i - 2, i - 1, i + 1, i + 2].find((j) => j >= 0 && j < out.length && !drop.has(j) && pred(out[j]));
    if (it.type === "link" && it.text.trim() && !drop.has(i)) {
      const j = near((x) => x.type === "paragraph" && !x.href && same(x.text, it.text));
      if (j !== undefined && !(/worldcast/i.test(it.url) || /\b3d\b/i.test(it.text))) {
        (out[j] as Extract<Item, { type: "paragraph" }>).href = it.url;
        drop.add(i);
      }
    } else if (it.type === "pdf" && it.url !== brochureUrl && it.text.trim() && !drop.has(i)) {
      const j = near((x) => x.type === "paragraph" && !x.href && same(x.text, it.text));
      if (j !== undefined) {
        (out[j] as Extract<Item, { type: "paragraph" }>).href = it.url;
        drop.add(i);
      }
      const h = near((x) => x.type === "heading" && same(x.text, it.text));
      if (h !== undefined) drop.add(h); // the heading only repeats the file's label
    }
  });
  return out.filter((_, i) => !drop.has(i));
}

/** Consecutive rows (same top, ≥2 cells, same cell count, ≥3 rows) of short paragraphs → a table item. */
function gridsToTables(items: Item[], flags: string[]): Item[] {
  const out: Item[] = [];
  let i = 0;
  const cell = (it: Item | undefined): it is Extract<Item, { type: "paragraph" }> => !!it && it.type === "paragraph" && !!it.box && clean(it.text).split(" ").length <= 8;
  const rowAt = (start: number): Item[] => {
    const first = items[start];
    if (!cell(first)) return [];
    const row: Item[] = [first];
    for (let j = start + 1; cell(items[j]) && Math.abs(items[j].box!.y - first.box!.y) <= 14 && items[j].box!.x > row[row.length - 1].box!.x; j++) row.push(items[j]);
    return row.length >= 2 ? row : [];
  };
  while (i < items.length) {
    const rows: Item[][] = [];
    let j = i;
    for (let r = rowAt(j); r.length; r = rowAt(j)) {
      if (rows.length && r.length !== rows[0].length) break;
      rows.push(r);
      j += r.length;
    }
    if (rows.length >= 3) {
      const cells = rows.flat();
      const xs = cells.map((c) => c.box!);
      const x = Math.min(...xs.map((b) => b.x));
      const y = Math.min(...xs.map((b) => b.y));
      out.push({
        type: "table",
        rows: rows.map((r) => r.map((c) => clean((c as Extract<Item, { type: "paragraph" }>).text))),
        box: { x, y, w: Math.max(...xs.map((b) => b.x + b.w)) - x, h: Math.max(...xs.map((b) => b.y + b.h)) - y },
      });
      flags.push("text_grid_flattened_to_list");
      i = j;
    } else {
      out.push(items[i]);
      i += 1;
    }
  }
  return out;
}

/**
 * Pulls the product's own data and the page's structure apart in visual order
 * and returns the layout. `items` must carry `box` (the visual-order scrape).
 */
export function mapProductLayout(entry: Pick<LegacyEntry, "title" | "group" | "slug" | "name">, page: LayoutPage, ctx: MapContext): MappedProductLayout {
  const flags: string[] = [];
  const name = entry.name ?? (cleanProductName(page.title) || entry.title);

  // ---- 1. clean the item list -------------------------------------------------------------
  let items: Item[] = page.items.filter((i) => i.type !== "image" || isContentImage(i, ctx));

  // Stray fragments: a lone "TM" heading/paragraph, or "TM" inside a heading.
  items = items.flatMap((i): Item[] => {
    if ((i.type === "heading" || i.type === "paragraph") && STRAY_FRAGMENT.test(i.text.trim())) {
      flags.push("stray_fragment_dropped");
      return [];
    }
    if (i.type === "heading") {
      const text = stripStray(i.text);
      if (text !== i.text) flags.push("stray_fragment_dropped");
      return text ? [{ ...i, text }] : [];
    }
    return [i];
  });

  // Section labels Wix draws as paragraphs ("BENEFITS", "Features"), and a run of "Title: explanation" paragraphs
  // under a benefits-style heading, are headings and a list — same as if the page had used real markup.
  items = promoteLabels(items, flags);

  // Wix draws a link as a label next to a separate link element; fold them back into one linked paragraph.
  const brochure = brochureOf(page, name);
  items = foldLinkedLabels(items, brochure?.url);

  items = joinWrappedLines(items);

  // A grid of short paragraphs laid out in rows and columns (a Wix "table" built from text boxes, e.g. the
  // Well Shock Kits catalogue) becomes one table item, so its cells do not read as unrelated paragraphs.
  items = gridsToTables(items, flags);

  // Wix lays a video's poster image exactly over the video: it is the player's cover, not page content.
  const videoBoxes = items.flatMap((i) => (i.type === "video" && i.box ? [i.box] : []));
  items = items.filter((i) => {
    if (i.type !== "image" || !i.box) return true;
    const b = i.box;
    const isPoster = videoBoxes.some((v) => Math.abs(v.x - b.x) <= 6 && Math.abs(v.y - b.y) <= 6 && Math.abs(v.w - b.w) <= 12 && Math.abs(v.h - b.h) <= 12);
    if (isPoster) flags.push("video_poster_dropped");
    return !isPoster;
  });

  // The page title heading is the product name (hero); drop every H1.
  items = items.filter((i) => !(i.type === "heading" && i.level === 1));

  // The hero diagram is the first content image.
  const diagramIdx = items.findIndex((i) => i.type === "image");
  const diagramItem = diagramIdx >= 0 ? (items[diagramIdx] as Extract<Item, { type: "image" }>) : null;

  // Text drawn on top of an image (captions "Extended"/"Compressed", dimension labels such as 1.89" OD):
  // a caption when it is plain words, the image's alt text otherwise — never body copy.
  const overlay = new Map<Item, { caption: string[]; labels: string[] }>();
  const consumedOverlay = new Set<Item>();
  const imagesWithBox = items.filter((i): i is Extract<Item, { type: "image" }> => i.type === "image" && !!i.box);
  for (const [pi, p] of items.entries()) {
    if ((p.type !== "paragraph" && p.type !== "heading") || !p.box) continue;
    const words = clean(p.text).split(" ").length;
    if (words > 6 || (p.type === "heading" && p.box.w > 400)) continue; // wide headings are section headings, not labels
    // Real content that merely sits in the diagram's (often page-sized) box: linked labels, section words, a list's label.
    if ((p.type === "paragraph" && p.href) || LEARN_MORE.test(clean(p.text)) || LABEL_WORD.test(clean(p.text)) || items[pi + 1]?.type === "list") continue;
    const host = imagesWithBox.find((img) => img.box && area(img.box) > area(p.box!) * 4 && inside(p.box!, img.box));
    if (!host) continue;
    const entryFor = overlay.get(host) ?? { caption: [], labels: [] };
    if (/\d/.test(p.text)) entryFor.labels.push(clean(p.text));
    else entryFor.caption.push(clean(p.text));
    overlay.set(host, entryFor);
    consumedOverlay.add(p);
  }
  if (consumedOverlay.size) flags.push("image_overlay_text_moved");
  items = items.filter((i) => !consumedOverlay.has(i));

  // The 3D prompt and the "download" label are the buttons' labels, not copy.
  let model3dUrl: string | null = null;
  const dropIdx = new Set<number>();
  items.forEach((i, idx) => {
    if (i.type === "link" && i.external && (/worldcast/i.test(i.url) || /\b3d\b/i.test(i.text))) {
      model3dUrl ??= i.url;
      dropIdx.add(idx);
    }
    if (i.type === "paragraph" && (THREE_D_PROMPT.test(clean(i.text)) || PDF_LABEL.test(clean(i.text)))) dropIdx.add(idx);
    if (i.type === "heading" && THREE_D_PROMPT.test(clean(i.text))) dropIdx.add(idx);
  });
  // Where the PDF / 3D buttons sit on the page. They are separate elements on Wix; the 3D prompt is the
  // section-like one ("See this tool in 3D", after the content), so it wins, else the PDF's spot.
  const threeDAt = items.findIndex((i, idx) => i.type === "link" && dropIdx.has(idx));
  const pdfAt = items.findIndex((i) => i.type === "pdf" && i.url.startsWith(LEGACY_BASE));
  // With no 3D link, the PDF icon's spot is arbitrary (it can sit between a label and its text): put the buttons last.
  const downloadsAt = threeDAt >= 0 ? threeDAt : pdfAt >= 0 ? items.length : -1;
  const seq: Item[] = [];
  const downloadsMarker: Item = { type: "paragraph", text: "\u0000downloads" };
  items.forEach((i, idx) => {
    if (idx === downloadsAt) seq.push(downloadsMarker);
    if (!dropIdx.has(idx)) seq.push(i);
  });
  if (downloadsAt === items.length) seq.push(downloadsMarker);

  // ---- 2. text that belongs to a video ------------------------------------------------------
  type Media = { video: Extract<Item, { type: "video" }>; texts: Item[]; layout: "media-left" | "media-right" | "media-above" };
  const mediaOf = new Map<Item, Media>();
  const claimed = new Set<Item>();
  for (const v of seq) {
    if (v.type !== "video" || !v.box || v.provider === "other") continue;
    const V = v.box;
    const picked: Item[] = [];
    let layout: Media["layout"] | null = null;
    // Beside the video (either side), then stacked under it.
    const candidates = seq.filter((p) => p.type === "paragraph" && !!p.box && !claimed.has(p) && p !== downloadsMarker);
    const side = candidates.filter((p) => {
      const B = p.box!;
      return verticalOverlap(V, B) >= 0.3 && (B.x >= V.x + V.w - 24 || B.x + B.w <= V.x + 24);
    });
    if (side.length) {
      picked.push(...side);
      layout = side[0].box!.x > V.x ? "media-left" : "media-right";
    }
    // Under the video: stacked paragraphs (gap ≤ 60px) starting within 140px of its bottom edge.
    let bottom = Math.max(V.y + V.h, ...picked.map((p) => p.box!.y + p.box!.h));
    const below = candidates.filter((p) => !picked.includes(p) && horizontalOverlap(V, p.box!) > 0.3 && p.box!.y >= V.y + V.h - 12).sort((a, b) => a.box!.y - b.box!.y);
    for (const p of below) {
      const gap = p.box!.y - bottom;
      if (gap > (picked.length ? 60 : 140)) break;
      picked.push(p);
      bottom = p.box!.y + p.box!.h;
      layout ??= "media-above";
    }
    if (picked.length && layout) {
      picked.sort((a, b) => seq.indexOf(a) - seq.indexOf(b));
      picked.forEach((p) => claimed.add(p));
      mediaOf.set(v, { video: v, texts: picked, layout });
    }
  }

  // ---- 3. benefits list ----------------------------------------------------------------------
  /** A short, unpunctuated paragraph that labels what follows it (a list, or longer text): Wix draws these as paragraphs. */
  const isLabel = (it: Item | undefined, next: Item | undefined): boolean =>
    !!it && it.type === "paragraph" && !it.href && it !== downloadsMarker && !claimed.has(it) && clean(it.text).split(" ").length <= 5 && !/[.:;!?]$/.test(clean(it.text)) && (next?.type === "list" || next?.type === "image" || isPseudoHeading(it, next) || LEARN_MORE.test(clean(it.text)));
  const headingBefore = (idx: number): string | null => {
    let k = idx - 1;
    while (k >= 0 && (seq[k].type === "pdf" || seq[k].type === "link")) k--; // file icons sit on the same line as the heading
    const prev = seq[k];
    if (prev?.type === "heading") return prev.text;
    if (isLabel(prev, seq[idx])) return (prev as Extract<Item, { type: "paragraph" }>).text;
    return null;
  };
  let benefitsIdx = -1;
  seq.forEach((it, idx) => {
    if (benefitsIdx >= 0 || it.type !== "list" || it.ordered || it.items.length > MAX_BENEFITS) return;
    const h = headingBefore(idx);
    if (h && BENEFIT_HEADING.test(h)) benefitsIdx = idx;
  });
  if (benefitsIdx < 0) {
    seq.forEach((it, idx) => {
      if (benefitsIdx >= 0 || it.type !== "list" || it.ordered || it.items.length > MAX_BENEFITS) return;
      const h = headingBefore(idx);
      if (h && LIST_HEADING.test(h)) benefitsIdx = idx;
    });
  }
  if (benefitsIdx < 0) {
    // No labelled list: the first bullet list that appears before any heading is the benefits list.
    const firstHeading = seq.findIndex((s) => s.type === "heading");
    const idx = seq.findIndex((s) => s.type === "list" && !s.ordered && s.items.length <= MAX_BENEFITS);
    if (idx >= 0 && (firstHeading < 0 || idx < firstHeading)) benefitsIdx = idx;
  }

  // ---- 4. walk the page in order ------------------------------------------------------------
  const layout: LayoutSeed[] = [];
  const imageAlts: { url: string; alt: string }[] = [];
  const emitted = new Set<LinkedSectionType>();
  const intro: string[] = [];
  const specs: MappedProductLayout["specs"] = [];
  let benefits: { title: string; body?: string }[] = [];
  let videoUrl: string | null = null;
  let seenStructure = false; // intro text ends at the first heading / list / media
  let pendingHeading: string | null = null;
  let lastLabel: string | null = null; // the nearest heading/label above, for image alt text
  let buffer: Item[] = [];
  let pendingImages: { url: string; alt: string; caption?: string; width?: number }[] = [];

  const display = (t: string) => headingText(t);
  const linked = (type: LinkedSectionType, title: string, visible = true) => {
    emitted.add(type);
    layout.push({
      type,
      is_visible: visible,
      data: { title, background: LINKED_SECTIONS[type].defaultBackground },
    });
  };
  const extra = (type: string, data: Record<string, Json>) => layout.push({ type, is_visible: true, data: { background: "cream", ...data } });

  const flushText = () => {
    const rt = toRichTextDoc(buffer);
    if (rt) {
      extra("rich_text", { content: rt.doc });
      flags.push(...rt.flags);
    }
    buffer = [];
  };
  const flushImages = () => {
    if (pendingImages.length >= 3) {
      extra("image_gallery", { images: pendingImages.map((i) => ({ url: i.url, alt: i.alt })) });
    } else {
      for (const img of pendingImages) {
        extra("image", { imageUrl: img.url, alt: img.alt, decorative: false, aspectRatio: "auto", alignment: img.width && img.width >= 1000 ? "full" : img.width && img.width >= 400 ? "center" : "left", ...(img.caption ? { caption: img.caption } : {}) });
      }
    }
    pendingImages = [];
  };
  const flushAll = () => {
    flushText();
    flushImages();
  };
  /** A heading with nothing to label yet becomes the start of the next text run. */
  const takeHeading = (): string | null => {
    const h = pendingHeading;
    pendingHeading = null;
    return h;
  };
  const headingToBuffer = () => {
    const h = takeHeading();
    if (h) buffer.push({ type: "heading", level: 2, text: display(h) });
  };

  seq.forEach((it, idx) => {
    const next = seq[idx + 1];

    if (it === downloadsMarker) {
      flushAll();
      const h = pendingHeading && /how (it|does it) works?/i.test(pendingHeading) ? takeHeading() : null;
      if (pendingHeading) headingToBuffer(); // some other heading stays as text, ahead of the buttons
      flushText();
      linked("product_downloads", h ? display(h) : "");
      seenStructure = true;
      return;
    }

    switch (it.type) {
      case "heading": {
        flushAll();
        if (pendingHeading) headingToBuffer();
        flushText();
        pendingHeading = it.text;
        lastLabel = it.text;
        seenStructure = true;
        break;
      }
      case "paragraph": {
        if (claimed.has(it)) break; // lives in a media_text block
        const text = clean(it.text);
        if (!seenStructure && intro.length > 0 && isLabel(it, next) && (next?.type === "list" || LEARN_MORE.test(text))) {
          // "Features" / "Benefits" drawn as a paragraph: it ends the intro and labels the list.
          seenStructure = true;
          pendingHeading = text;
          break;
        }
        if (!seenStructure) {
          intro.push(text);
          break;
        }
        flushImages();
        if (isLabel(it, next) && next?.type === "list" && !pendingHeading && benefitsIdx === idx + 1) {
          flushAll();
          pendingHeading = text; // labels the benefits list
        } else if (isLabel(it, next) && !(next && claimed.has(next))) {
          if (pendingHeading) headingToBuffer();
          buffer.push({ type: "heading", level: 3, text: display(text) });
          lastLabel = text;
          flags.push("pseudo_heading_promoted");
        } else {
          if (pendingHeading) headingToBuffer();
          buffer.push({ ...it, text, ...(it.href ? { href: it.href } : {}) });
        }
        break;
      }
      case "list": {
        seenStructure = true;
        if (idx === benefitsIdx) {
          flushAll();
          const h = takeHeading() ?? (headingBefore(idx) ? null : null);
          const split = it.items.every((t) => TITLE_BODY.test(clean(t)));
          benefits = it.items.map((t) => {
            const text = clean(t);
            if (!split) return { title: text };
            const cut = text.indexOf(":");
            return { title: text.slice(0, cut).trim(), body: text.slice(cut + 1).trim() };
          });
          linked("product_benefits", h ? display(h) : "");
        } else if (!it.ordered && pendingHeading && SPEC_HEADING.test(pendingHeading) && it.items.every((t) => TITLE_BODY.test(clean(t))) && !emitted.has("product_specs")) {
          // "Considerations: Length of the tool: 30 ft…" — the product's specification rows, where Wix shows them.
          flushAll();
          const h = takeHeading()!;
          for (const t of it.items) {
            const text = clean(t);
            const cut = text.indexOf(":");
            specs.push({ label: text.slice(0, cut).trim(), value: text.slice(cut + 1).trim() });
          }
          linked("product_specs", display(h));
          seenStructure = true;
        } else if (!it.ordered && it.items.length <= MAX_CARD_ITEMS && pendingHeading) {
          flushAll();
          const h = takeHeading()!;
          extra("benefits_cards", { background: "navy", title: display(h), items: it.items.map((title) => ({ title: clean(title) })) });
        } else {
          flushImages();
          if (pendingHeading) headingToBuffer();
          buffer.push(it);
        }
        break;
      }
      case "table": {
        flushAll();
        const twoCol = it.rows.length > 0 && it.rows.every((r) => r.filter(Boolean).length === 2);
        if (twoCol && !emitted.has("product_specs")) {
          const h = takeHeading();
          for (const r of it.rows) specs.push({ label: r[0], value: r[1] });
          linked("product_specs", h ? display(h) : "");
        } else {
          if (pendingHeading) headingToBuffer();
          buffer.push(it);
          flags.push("table_flattened_to_list");
        }
        seenStructure = true;
        break;
      }
      case "image": {
        if (it === diagramItem) {
          const alt = looksLikeFilename(it.alt) ? `${name} diagram` : it.alt;
          imageAlts.push({ url: wixOriginalUrl(it.src), alt });
          break;
        }
        if (intro.length) seenStructure = true; // images before the first paragraph are part of the hero area
        flushText();
        if (pendingHeading) {
          // The heading labels the image run; keep it as its own text block ahead of it.
          flushImages();
          const h = takeHeading()!;
          extra("rich_text", { content: toRichTextDoc([{ type: "heading", level: 2, text: display(h) }])!.doc });
        }
        const ov = overlay.get(it);
        let alt = it.alt;
        if (looksLikeFilename(alt)) {
          const label = lastLabel ? display(lastLabel) : altFor(seq, seq.indexOf(it), name);
          const isTable = /table|size/i.test(decodeURIComponent(it.src.split("/").pop() ?? "")) && !/table/i.test(label);
          alt = ov?.labels.length ? ov.labels.join(" ") : `${label}${isTable ? " (table)" : ""}`;
          flags.push(PLACEHOLDER_ALT_FLAG);
        }
        const url = wixOriginalUrl(it.src);
        const caption = [...(ov?.caption ?? []), ...(it.caption ? [it.caption] : [])].join(" · ") || undefined;
        pendingImages.push({ url, alt, caption, width: it.natural?.w });
        imageAlts.push({ url, alt });
        break;
      }
      case "video": {
        if (it.provider === "other") {
          flags.push("video_widget_skipped");
          break;
        }
        seenStructure = true;
        flushAll();
        const media = mediaOf.get(it);
        const heading = takeHeading();
        const first = !videoUrl;
        if (first) videoUrl = it.url;
        if (media) {
          // The first video still lives in products.video_url; the linked Video row stays but hidden, so it isn't shown twice.
          const texts = media.texts;
          let title = heading ? display(heading) : "";
          let bodyTexts = texts;
          const lead = texts[0];
          if (!title && lead && lead.type === "paragraph" && isPseudoHeading(lead, texts[1])) {
            title = clean(lead.text);
            bodyTexts = texts.slice(1);
            flags.push("pseudo_heading_promoted");
          }
          extra("media_text", {
            title,
            mediaType: "video",
            videoUrl: it.url,
            ...(diagramItem ? { posterImageUrl: wixOriginalUrl(diagramItem.src) } : {}),
            layout: media.layout,
            body: bodyTexts.map((t) => (t.type === "paragraph" ? clean(t.text) : "")).filter(Boolean).join("\n\n"),
          });
          if (first) linked("product_video", "", false);
        } else if (first) {
          linked("product_video", heading ? display(heading) : "");
        } else {
          extra("video_embed", { title: heading ? display(heading) : "", videoUrl: it.url, ...(diagramItem ? { posterImageUrl: wixOriginalUrl(diagramItem.src) } : {}) });
        }
        break;
      }
      case "pdf": {
        // The brochure is the Downloads button; other PDFs ("Learn more about this tool") are linked text.
        if (brochureOf(page, name)?.url === it.url) break;
        if (!it.text.trim()) break;
        seenStructure = true;
        flushImages();
        if (pendingHeading) headingToBuffer();
        buffer.push({ type: "paragraph", text: clean(it.text), href: it.url });
        break;
      }
      case "link": {
        if (!it.external) break;
        break; // external links other than the 3D viewer are not part of the product page copy
      }
    }
  });
  flushAll();
  if (pendingHeading) {
    // A trailing heading with nothing under it: keep it so Wix's text is not lost.
    extra("rich_text", { content: toRichTextDoc([{ type: "heading", level: 2, text: display(pendingHeading) }])!.doc });
  }

  // Linked sections the page had no spot for: appended, in template order (they render nothing when empty).
  for (const type of LINKED_SECTION_TYPES) {
    if (!emitted.has(type)) linked(type, LINKED_SECTIONS[type].defaultTitle);
  }

  // Defensive: a video the walk did not reach but the scrape listed.
  const summary = intro.join("\n\n") || null;
  if (!summary) flags.push("no_summary");
  if (!benefits.length) flags.push("no_benefits");

  const group = entry.group;
  const categorySlug = GROUP_CATEGORY[group] ?? null;
  if (!categorySlug) flags.push("category_needs_review");

  return {
    slug: entry.slug!,
    name,
    categorySlug,
    summary,
    diagramImageUrl: diagramItem ? wixOriginalUrl(diagramItem.src) : null,
    videoUrl,
    brochurePdfUrl: brochureOf(page, name)?.url ?? null,
    model3dUrl,
    benefits,
    specs,
    layout,
    imageAlts,
    flags: [...new Set(flags)],
    seoTitle: cleanTitle(page.title) || name,
    seoDescription: page.meta_description,
  };
}

/** The product's own brochure: a PDF labelled like the product / "brochure" / "datasheet"; case studies are not it. */
function brochureOf(page: LayoutPage, name: string): { url: string; text: string } | undefined {
  const pdfs = page.items.filter((i): i is Extract<Item, { type: "pdf" }> => i.type === "pdf" && i.url.startsWith(LEGACY_BASE));
  const nameTokens = normalizeProductName(name);
  const squash = (t: string) => normalizeProductName(t).replace(/\s+/g, "");
  return (
    pdfs.find((p) => normalizeProductName(p.text) === nameTokens && nameTokens) ??
    pdfs.find((p) => squash(p.text) === squash(name) && squash(name)) ??
    pdfs.find((p) => /brochure|data ?sheet|spec/i.test(p.text)) ??
    pdfs.find((p) => !/case study|learn more/i.test(p.text))
  );
}
