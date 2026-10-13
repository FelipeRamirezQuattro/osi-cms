/**
 * Pure cleaning for batch-2 extraction (scraper output → stored JSON).
 * Same rules as batch 1 (zero-width characters, Wix-split headings, nav
 * chrome) plus the floating "contact the agent" widget and cookie
 * banners. Kept free of Playwright so it is unit-testable.
 */

export type ScrapedItem =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; rows: string[][] }
  | { type: "image"; src: string; alt: string; caption?: string }
  | { type: "video"; url: string; provider: "youtube" | "wix" | "other" }
  | { type: "pdf"; url: string; text: string }
  | { type: "link"; url: string; text: string; external: boolean };

const ZERO_WIDTH = /[​-‏⁠﻿]/g;

export function stripZeroWidth(s: string): string {
  return s.replace(ZERO_WIDTH, "");
}

export function normalizeText(s: string): string {
  return stripZeroWidth(s).replace(/\s+/g, " ").trim();
}

/** Site chrome and cookie text the scraper picks up as body copy. */
const CHROME_EXACT = new Set(
  [
    "about us",
    "customer cloud",
    "careers",
    "directory",
    "downloads",
    "hiring",
    "services",
    "hse",
    "more",
    "get in touch",
    "contact us",
    "accept",
    "decline",
    "accept all",
    "reject all",
  ],
);

const CHROME_PATTERNS = [
  /\bcookie(s)?\b.*\b(policy|consent|accept|preferences)\b/i,
  /^we use cookies/i,
  /contact (the )?(agent|representative)/i,
  /^(skip to|open|close) (main )?(content|menu)$/i,
];

export function isChromeText(text: string): boolean {
  const t = normalizeText(text);
  if (!t) return true;
  return CHROME_EXACT.has(t.toLowerCase()) || CHROME_PATTERNS.some((re) => re.test(t));
}

/**
 * Wix splits one visual heading across several <h2>s ("USEFUL"/"FOR"/
 * "YOUR"/"NEEDS"). Consecutive headings of the same level join into one.
 */
export function mergeSplitHeadings(items: ScrapedItem[]): ScrapedItem[] {
  const out: ScrapedItem[] = [];
  for (const item of items) {
    const last = out[out.length - 1];
    if (item.type === "heading" && last?.type === "heading" && last.level === item.level) {
      last.text = `${last.text} ${item.text}`;
    } else {
      out.push({ ...item });
    }
  }
  return out;
}

const itemKey = (item: ScrapedItem): string => {
  switch (item.type) {
    case "heading":
    case "paragraph":
      return `${item.type}:${normalizeText(item.text).toLowerCase()}`;
    case "list":
      return `list:${item.items.map((i) => normalizeText(i).toLowerCase()).join("|")}`;
    case "table":
      return `table:${item.rows.map((r) => r.join("¦")).join("|")}`;
    case "image":
      return `image:${imageIdentity(item.src)}`;
    case "video":
    case "pdf":
    case "link":
      return `${item.type}:${item.url}`;
  }
};

/** Wix image URLs differ only by transform suffix; the media id is stable. */
export function imageIdentity(src: string): string {
  const m = src.match(/\/media\/([^/]+?~mv2\.[a-z0-9]+)/i);
  return m ? m[1] : src;
}

/**
 * Wix serves resized/cropped renditions at `<file>/v1/(crop|fill|fit)/…`.
 * The scrape captured those, so a stored URL could point at a CROPPED copy
 * (QA: "product image not shown complete"). The bare `/media/<file>` URL is
 * the original, uncropped asset — store that.
 */
export function wixOriginalUrl(src: string): string {
  const m = src.match(/^(https?:\/\/static\.wixstatic\.com\/media\/[^/?#]+)/i);
  return m ? m[1] : src;
}

/** Drops exact repeats (Wix repeats blocks for responsive layouts). First occurrence wins. */
export function dedupeItems(items: ScrapedItem[]): ScrapedItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = itemKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function cleanItems(items: ScrapedItem[]): ScrapedItem[] {
  const normalized: ScrapedItem[] = [];
  for (const item of items) {
    switch (item.type) {
      case "heading":
      case "paragraph": {
        const text = normalizeText(item.text);
        if (!text || isChromeText(text)) break;
        normalized.push({ ...item, text });
        break;
      }
      case "list": {
        const list = item.items.map(normalizeText).filter((t) => t && !isChromeText(t));
        if (list.length) normalized.push({ ...item, items: list });
        break;
      }
      case "table": {
        const rows = item.rows
          .map((r) => r.map(normalizeText))
          .filter((r) => r.some((c) => c));
        if (rows.length) normalized.push({ ...item, rows });
        break;
      }
      case "image":
        normalized.push({ ...item, alt: normalizeText(item.alt), caption: item.caption ? normalizeText(item.caption) : undefined });
        break;
      case "link": {
        const text = normalizeText(item.text);
        if (item.url && !isChromeText(text)) normalized.push({ ...item, text });
        break;
      }
      default:
        normalized.push(item);
    }
  }
  return dedupeItems(mergeSplitHeadings(normalized));
}

/**
 * The floating "contact the agent" widget renders as: portrait image,
 * "Contact Him/Her", a person's name, a job title. Drop the whole group
 * (it is per-page chrome, not page content) and report what was dropped.
 */
export function stripAgentWidget(items: ScrapedItem[]): { items: ScrapedItem[]; dropped: string[] } {
  const drop = new Set<number>();
  const dropped: string[] = [];
  items.forEach((item, i) => {
    if (item.type !== "paragraph" || !/^contact (him|her|them)$/i.test(item.text)) return;
    drop.add(i);
    if (items[i - 1]?.type === "image") drop.add(i - 1);
    for (let j = i + 1; j <= i + 2; j++) {
      const next = items[j];
      if (next?.type === "paragraph") {
        drop.add(j);
        dropped.push(next.text);
      }
    }
  });
  return { items: items.filter((_, i) => !drop.has(i)), dropped };
}

/** Wix transform URLs carry the rendered width as `w_123`. Icons/bullets are decorative. */
export function isTinyImage(src: string, maxWidth = 120): boolean {
  const w = src.match(/\/w_(\d+)/);
  return w ? Number(w[1]) <= maxWidth : false;
}

/**
 * Wix emits bullets as "- text" paragraphs, sometimes with a wrapped
 * continuation line as its own paragraph ("- Downhole failures are" /
 * "greatly reduced."). Group them into list items; a continuation is a
 * non-bullet paragraph right after a bullet that doesn't end a sentence.
 */
export function groupBullets(items: ScrapedItem[]): ScrapedItem[] {
  const out: ScrapedItem[] = [];
  let current: string[] | null = null;
  const flush = () => {
    if (current) out.push({ type: "list", ordered: false, items: current });
    current = null;
  };
  for (const item of items) {
    if (item.type === "paragraph" && /^[-•–]\s*/.test(item.text)) {
      current ??= [];
      current.push(item.text.replace(/^[-•–]\s*/, ""));
    } else if (item.type === "paragraph" && current && !/[.!?:]$/.test(current[current.length - 1])) {
      current[current.length - 1] = `${current[current.length - 1]} ${item.text}`;
    } else if (item.type === "paragraph" && current && /^[a-z]/.test(item.text)) {
      current[current.length - 1] = `${current[current.length - 1]} ${item.text}`;
    } else {
      flush();
      out.push(item);
    }
  }
  flush();
  return out;
}

/** Full pipeline used by the scraper. */
export function cleanPage(items: ScrapedItem[]): { items: ScrapedItem[]; droppedWidget: string[] } {
  const cleaned = cleanItems(items).filter((x) => x.type !== "image" || !isTinyImage(x.src));
  const { items: noWidget, dropped } = stripAgentWidget(cleaned);
  return { items: groupBullets(noWidget), droppedWidget: dropped };
}
