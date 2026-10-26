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
  sentenceCase,
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
  benefits: { title: string }[];
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

const clean = (t: string) => t.replace(/\s+/g, " ").trim();

/** Removes a stray "TM" token Wix draws as a superscript beside a name ("TM Benefits"). */
const stripStray = (t: string) => clean(t.replace(/(^|\s)(TM|™)(?=\s|$)/g, " "));

function isContentImage(i: Item, ctx: MapContext): i is Extract<Item, { type: "image" }> {
  return i.type === "image" && !ctx.chromeImages.has(imageIdentity(i.src));
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
  for (const p of items) {
    if (p.type !== "paragraph" || !p.box) continue;
    const words = clean(p.text).split(" ").length;
    if (words > 6) continue;
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
  const downloadsAt = threeDAt >= 0 ? threeDAt : pdfAt;
  const seq: Item[] = [];
  const downloadsMarker: Item = { type: "paragraph", text: "\u0000downloads" };
  items.forEach((i, idx) => {
    if (idx === downloadsAt) seq.push(downloadsMarker);
    if (!dropIdx.has(idx)) seq.push(i);
  });

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
  const headingBefore = (idx: number): string | null => {
    for (let i = idx - 1; i >= 0; i--) {
      const it = seq[i];
      if (it.type === "heading") return it.text;
      if (it.type === "paragraph" && it !== downloadsMarker && isPseudoHeading(it, seq[i + 1]) && i + 1 === idx - 0) return it.text;
      if (it.type === "list" || it.type === "video" || it.type === "image") return null;
    }
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
  let benefits: { title: string }[] = [];
  let videoUrl: string | null = null;
  let seenStructure = false; // intro text ends at the first heading / list / media
  let pendingHeading: string | null = null;
  let buffer: Item[] = [];
  let pendingImages: { url: string; alt: string; caption?: string }[] = [];

  const display = (t: string) => sentenceCase(clean(t));
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
        extra("image", { imageUrl: img.url, alt: img.alt, decorative: false, aspectRatio: "auto", alignment: "full", ...(img.caption ? { caption: img.caption } : {}) });
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
        seenStructure = true;
        break;
      }
      case "paragraph": {
        if (claimed.has(it)) break; // lives in a media_text block
        const text = clean(it.text);
        if (!seenStructure) {
          intro.push(text);
          break;
        }
        flushImages();
        if (isPseudoHeading(it, next) && !(next && claimed.has(next))) {
          if (pendingHeading) headingToBuffer();
          buffer.push({ type: "heading", level: 3, text });
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
          benefits = it.items.map((title) => ({ title: clean(title) }));
          linked("product_benefits", h ? display(h) : "");
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
          alt = ov?.labels.length ? ov.labels.join(" ") : altFor(seq.filter((s) => s !== downloadsMarker), seq.indexOf(it), name);
          flags.push(PLACEHOLDER_ALT_FLAG);
        }
        const url = wixOriginalUrl(it.src);
        const caption = [...(ov?.caption ?? []), ...(it.caption ? [it.caption] : [])].join(" · ") || undefined;
        pendingImages.push({ url, alt, caption });
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
            layout: media.layout,
            body: bodyTexts.map((t) => (t.type === "paragraph" ? clean(t.text) : "")).filter(Boolean).join("\n\n"),
          });
          if (first) linked("product_video", "", false);
        } else if (first) {
          linked("product_video", heading ? display(heading) : "");
        } else {
          extra("video_embed", { title: heading ? display(heading) : "", videoUrl: it.url });
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
  return (
    pdfs.find((p) => normalizeProductName(p.text) === nameTokens && nameTokens) ??
    pdfs.find((p) => /brochure|data ?sheet|spec/i.test(p.text)) ??
    pdfs.find((p) => !/case study|learn more/i.test(p.text))
  );
}
