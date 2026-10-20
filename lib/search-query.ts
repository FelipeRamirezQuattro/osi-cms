/**
 * Everything user-typed that reaches the search queries goes through here
 * first: control characters (a NUL byte makes Postgres reject the request),
 * runaway length (the query rides in a URL), and LIKE wildcards (a bare `%`
 * would otherwise match every row of the `ilike` tables).
 */
export const SEARCH_QUERY_MAX = 100;

export function normalizeSearchQuery(raw: string): string {
  return (
    raw
      // eslint-disable-next-line no-control-regex -- stripping control characters is the point
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, SEARCH_QUERY_MAX)
      .trim()
  );
}

/** Escapes LIKE/ILIKE wildcards so the text is matched literally. */
export function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}
