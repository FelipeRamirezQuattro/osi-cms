/**
 * Forge sets short titles in the uppercase display face and sentences in the
 * heading face in sentence case. CSS cannot count words, so headings render
 * `data-long` when their text runs past this many words (see app/forge.css).
 * Classic ignores the attribute.
 */
export const LONG_TITLE_WORDS = 6;

export function isLongTitle(text: string | null | undefined, maxWords: number = LONG_TITLE_WORDS): boolean {
  if (!text) return false;
  return text.trim().split(/\s+/).length > maxWords;
}

/** Spread onto a heading: `<h3 {...longTitle(item.title)}>`. */
export function longTitle(text: string | null | undefined): { "data-long"?: "" } {
  return isLongTitle(text) ? { "data-long": "" } : {};
}
