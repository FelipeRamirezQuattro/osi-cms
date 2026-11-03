/**
 * Search result snippets (P6): about 160 characters of a body around the first match, never the full body.
 * The database does the matching with English stemming ("careers" finds "career"), so the highlight uses the
 * same idea in a cheap form: each query word is cut back to a stem and matched as a word prefix.
 */
export const SNIPPET_LENGTH = 160;

const SUFFIX = /(?:ing|ed|es|s|ly)$/;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function searchTerms(query: string): string[] {
  const words = query.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  return [...new Set(words.filter((w) => w.length >= 2))];
}

function termSource(term: string): string {
  const stem = term.length > 4 ? term.replace(SUFFIX, "") : term;
  return `(?<![\\p{L}\\p{N}])${escapeRegExp(stem)}[\\p{L}\\p{N}]*`;
}

/** Start of the best match: the whole phrase when it is there, otherwise the earliest single word. */
function firstMatch(text: string, terms: string[]): number {
  if (terms.length > 1) {
    const phrase = new RegExp(terms.map(termSource).join("[^\\p{L}\\p{N}]+"), "iu").exec(text);
    if (phrase) return phrase.index;
  }
  let best = -1;
  for (const term of terms) {
    const m = new RegExp(termSource(term), "iu").exec(text);
    if (m && (best === -1 || m.index < best)) best = m.index;
  }
  return best;
}

/** A snippet of `text` around the first match of the query, or null when none of the words is in the text. */
export function buildSnippet(text: string | null | undefined, query: string, length = SNIPPET_LENGTH): string | null {
  if (!text) return null;
  const terms = searchTerms(query);
  if (terms.length === 0) return null;
  const flat = text.replace(/\s+/g, " ").trim();
  const at = firstMatch(flat, terms);
  if (at === -1) return null;

  let start = Math.max(0, at - Math.floor(length / 3));
  let end = Math.min(flat.length, start + length);
  start = Math.max(0, Math.min(start, end - length));
  // Do not begin or end in the middle of a word.
  if (start > 0) {
    const space = flat.indexOf(" ", start);
    if (space !== -1 && space < at) start = space + 1;
  }
  if (end < flat.length) {
    const space = flat.lastIndexOf(" ", end);
    if (space > at) end = space;
  }
  return `${start > 0 ? "…" : ""}${flat.slice(start, end).trim()}${end < flat.length ? "…" : ""}`;
}

export type SnippetPart = { text: string; hit: boolean };

/** Splits a snippet into plain and matching parts so the page can wrap the hits in <mark> without injecting HTML. */
export function highlightParts(snippet: string, query: string): SnippetPart[] {
  const terms = searchTerms(query);
  if (terms.length === 0) return [{ text: snippet, hit: false }];
  const pattern = new RegExp(terms.map(termSource).join("|"), "giu");
  const parts: SnippetPart[] = [];
  let last = 0;
  for (const m of snippet.matchAll(pattern)) {
    if (m[0] === "") continue;
    if (m.index > last) parts.push({ text: snippet.slice(last, m.index), hit: false });
    parts.push({ text: m[0], hit: true });
    last = m.index + m[0].length;
  }
  if (last < snippet.length) parts.push({ text: snippet.slice(last), hit: false });
  return parts;
}
