/**
 * Google Maps page URL -> an iframe src Google will actually serve.
 *
 * Appending `output=embed` to an arbitrary maps URL (the previous approach)
 * is refused by Google for `/maps/place/…/data=…` pages ("google.com refused
 * to connect"). The forms below are the ones that do embed: the "Embed a
 * map" `/maps/embed?pb=…` src untouched, and the keyless
 * `/maps?q=…&output=embed` / `?ll=…&z=…&output=embed` forms rebuilt from the
 * pieces of whatever the editor pasted.
 *
 * Host validation is the caller's job (embed.tsx's allowlist). Returns null
 * when the shape isn't recognized — never frame what we can't convert.
 */
const COORDS = /^@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:,(\d+(?:\.\d+)?)z)?/;

function build(params: Record<string, string>, base: URL): string {
  const out = new URL(`${base.origin}/maps`);
  for (const [key, value] of Object.entries(params)) out.searchParams.set(key, value);
  out.searchParams.set("output", "embed");
  return out.toString();
}

export function googleMapsEmbedSrc(parsed: URL): string | null {
  const path = parsed.pathname.replace(/\/+$/, "");

  // "Embed a map" src (or a URL already converted).
  if (path === "/maps/embed" && parsed.searchParams.has("pb")) return parsed.toString();

  const decode = (segment: string) => decodeURIComponent(segment.replace(/\+/g, " ")).trim();
  const segments = path.split("/").filter(Boolean); // ["maps", "place", "<name>", "@lat,lng,17z", "data=…"]
  if (segments[0] !== "maps" && segments.length > 0) return null;

  try {
    // /maps/place/<name>[/@lat,lng,z[/data=…]]
    if (segments[1] === "place" && segments[2]) {
      const coords = segments.slice(3).find((s) => COORDS.test(s))?.match(COORDS);
      const params: Record<string, string> = { q: decode(segments[2]) };
      if (coords) {
        params.ll = `${coords[1]},${coords[2]}`;
        if (coords[3]) params.z = coords[3];
      }
      return build(params, parsed);
    }
    // /maps/search/<query>[/@lat,lng,z]
    if (segments[1] === "search" && segments[2] && !COORDS.test(segments[2])) {
      return build({ q: decode(segments[2]) }, parsed);
    }
    // /maps/@lat,lng,z
    const bare = segments[1]?.match(COORDS);
    if (bare) {
      const params: Record<string, string> = { ll: `${bare[1]},${bare[2]}` };
      if (bare[3]) params.z = bare[3];
      return build(params, parsed);
    }
  } catch {
    return null; // malformed percent-encoding
  }

  // ?q= / ?query= on /maps, /maps/search/ or the legacy google.com/?q= style.
  const q = parsed.searchParams.get("q") ?? parsed.searchParams.get("query");
  if (q && (path === "" || path === "/maps" || path === "/maps/search")) {
    const params: Record<string, string> = { q };
    const ll = parsed.searchParams.get("ll");
    if (ll) params.ll = ll;
    return build(params, parsed);
  }
  return null;
}

/**
 * Google's "Embed a map" dialog hands out a whole `<iframe src="…">` snippet,
 * and that is what editors paste. Returns the snippet's `src` (HTML-decoded);
 * anything that isn't an iframe snippet is returned untouched. Only the src
 * string is taken — it still has to pass the same safe-href and host checks as
 * a pasted URL, so no markup or attribute from the snippet is ever kept.
 */
export function extractIframeSrc(input: unknown): unknown {
  if (typeof input !== "string" || !/<iframe\b/i.test(input)) return input;
  const match = input.match(/\bsrc\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  const src = match?.[1] ?? match?.[2];
  return src === undefined ? input : src.replace(/&amp;/g, "&").trim();
}
