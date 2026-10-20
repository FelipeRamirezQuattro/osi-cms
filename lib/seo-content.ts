/**
 * Pure helpers that turn page content into meta-description fallbacks. Used
 * by every route's generateMetadata and by the SEO fallback report script, so
 * "uses a fallback" means the same thing in both places.
 */

export const DESCRIPTION_MAX = 160;
/** Site-wide last resort; mirrors the root layout's description. */
export const SITE_DEFAULT_DESCRIPTION = "World-class downhole fluid-conditioning systems.";

/**
 * Titles imported from the old Wix site end in " | odessaseparator" (its
 * lower-case site slug). The root layout already appends the real site name,
 * so keeping the legacy suffix would render "Hiring | odessaseparator | Odessa
 * Separator Inc.". Stripped at render time; the stored value is untouched.
 */
export function cleanSeoTitle(title: string): string {
  const cleaned = title.replace(/\s*[|–—-]\s*odessaseparator(?:\.com)?\s*$/i, "").trim();
  return cleaned || title.trim();
}

/** Bullets and zero-width characters from pasted legacy copy make poor snippets. */
function stripListNoise(text: string): string {
  return text.replace(/[\u2022\u25cf\u00b7\u200b\u2060\ufeff]/g, " ");
}

/** Collapses whitespace and cuts at a word boundary with an ellipsis. */
export function truncateDescription(text: string, max = DESCRIPTION_MAX): string {
  const clean = stripListNoise(text).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.\-–—]+$/, "")}…`;
}

type TiptapNode = { type?: string; text?: string; content?: TiptapNode[] };

function nodeText(node: TiptapNode): string {
  if (typeof node.text === "string") return node.text;
  return (node.content ?? []).map(nodeText).join("");
}

/** The body paragraphs of a Tiptap doc as plain text (headings and lists skipped), in order. */
export function richTextParagraphs(doc: unknown): string[] {
  if (typeof doc !== "object" || doc === null) return [];
  const content = (doc as TiptapNode).content;
  if (!Array.isArray(content)) return [];
  return content
    .filter((node) => node.type === "paragraph")
    .map((node) => nodeText(node).replace(/\s+/g, " ").trim())
    .filter((text) => text.length > 0);
}

const TEXT_KEYS = ["subheading", "subtitle", "description", "intro", "summary", "text"] as const;
const MIN_USEFUL = 40;

/**
 * First usable prose in a page's blocks: a plain-text field on an early block
 * (hero subtitle and the like), else the opening paragraphs of the first rich
 * text. Null when the page has none (e.g. a page made only of link columns).
 */
export function deriveDescriptionFromBlocks(blocks: { type: string; data: unknown }[]): string | null {
  for (const block of blocks) {
    const data = block.data;
    if (typeof data !== "object" || data === null) continue;
    const record = data as Record<string, unknown>;
    for (const key of TEXT_KEYS) {
      const value = record[key];
      if (typeof value === "string" && value.trim().length >= MIN_USEFUL) return truncateDescription(value);
    }
    if (block.type === "rich_text") {
      const joined = richTextParagraphs(record.content).join(" ");
      if (joined.length >= MIN_USEFUL) return truncateDescription(joined);
    }
  }
  return null;
}

export type DescriptionSource = "seo_description" | "content" | "default";

/** The description to publish, and where it came from (so reports can list the fallbacks). */
export function resolveDescription(
  explicit: string | null | undefined,
  derive: () => string | null | undefined,
): { description: string; source: DescriptionSource } {
  if (explicit?.trim()) return { description: explicit.trim(), source: "seo_description" };
  const derived = derive();
  if (derived?.trim()) return { description: truncateDescription(derived), source: "content" };
  return { description: SITE_DEFAULT_DESCRIPTION, source: "default" };
}
