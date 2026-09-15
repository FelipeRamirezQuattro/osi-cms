import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { embedBlock, isAllowedHost, toEmbedSrc } from "@/components/blocks/embed";

/**
 * Task 9's highest-scrutiny item — and the subject of a real security
 * review finding on the first pass: `provider` didn't actually gate
 * `url` at all, so `{provider: "youtube", url: "https://attacker.example/pwn"}`
 * was schema-valid and rendered verbatim in an iframe. Two things made
 * that worse than "a weak embed": (1) safeHrefSchema also allows a
 * same-origin "/path", and a same-origin document framed with
 * `allow-scripts allow-same-origin` can reach into
 * `window.parent.document` and strip its own sandbox — a genuine
 * sandbox escape, not just an unsafe third party; (2) the old Maps
 * check was a substring match anywhere in the raw URL string, so a URL
 * containing "google.com/maps" inside an unrelated query parameter
 * passed too. This file now covers: the provider allowlist, that `url`'s
 * *host* is independently validated against that provider (not just
 * "some https:// URL"), the specific malicious shapes above, the
 * YouTube/Vimeo/Maps URL transforms, fail-closed behavior when a
 * recognized host still isn't a recognizable embed, and that the
 * rendered iframe always carries a `sandbox` attribute with no
 * `dangerouslySetInnerHTML` anywhere.
 */

const base = {
  background: "cream" as const,
  spacingTop: "md" as const,
  spacingBottom: "md" as const,
  title: "Product overview video",
  aspectRatio: "16:9" as const,
};

describe("embed block schema — provider allowlist", () => {
  it("accepts each allowlisted provider with a matching real host", () => {
    const cases: Array<{ provider: "youtube" | "vimeo" | "google_maps"; url: string }> = [
      { provider: "youtube", url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      { provider: "vimeo", url: "https://vimeo.com/76979871" },
      { provider: "google_maps", url: "https://www.google.com/maps/embed?pb=1" },
    ];
    for (const { provider, url } of cases) {
      const result = embedBlock.schema.safeParse({ ...base, provider, url });
      expect(result.success).toBe(true);
    }
  });

  it("rejects an unapproved provider", () => {
    const result = embedBlock.schema.safeParse({
      ...base,
      provider: "spotify",
      url: "https://open.spotify.com/embed/track/abc",
    });
    expect(result.success).toBe(false);
  });
});

describe("embed block schema — host gating (security review finding)", () => {
  it("rejects provider: youtube with a non-YouTube host", () => {
    const result = embedBlock.schema.safeParse({
      ...base,
      provider: "youtube",
      url: "https://attacker.example/pwn",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a same-origin relative path — never valid for a third-party embed", () => {
    const result = embedBlock.schema.safeParse({
      ...base,
      provider: "youtube",
      url: "/pwn",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an arbitrary third-party host for google_maps", () => {
    const result = embedBlock.schema.safeParse({
      ...base,
      provider: "google_maps",
      url: "https://attacker.example/maps",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a Maps-lookalike query string on a non-Google host (the old substring-match bug)", () => {
    const result = embedBlock.schema.safeParse({
      ...base,
      provider: "google_maps",
      url: "https://attacker.example/?redirect=google.com/maps",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a vimeo.com-hosted URL when provider is youtube (cross-provider mismatch)", () => {
    const result = embedBlock.schema.safeParse({
      ...base,
      provider: "youtube",
      url: "https://vimeo.com/76979871",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a real Google country-TLD Maps host (not just .com)", () => {
    const result = embedBlock.schema.safeParse({
      ...base,
      provider: "google_maps",
      url: "https://www.google.co.uk/maps/embed?pb=1",
    });
    expect(result.success).toBe(true);
  });
});

/**
 * Second security-review pass: the first host-gating fix's Google Maps
 * branch used /^(?:www\.)?google\.[a-z.]{2,}$/ — an open character
 * class that happily matches "google.evil.com" ("evil.com" is itself a
 * valid [a-z.]{2,} string), so any attacker who owns any domain could
 * name a subdomain "google.<their-domain>" and pass. isAllowedHost's
 * google_maps branch is now exact-match against a fixed, enumerated
 * list (GOOGLE_MAPS_HOSTS) the same way youtube/vimeo always were —
 * these tests exercise that function directly, not just through the
 * schema, so a future regression back to a pattern would fail here even
 * if some other schema-level check happened to still catch that
 * specific case.
 */
describe("isAllowedHost — google_maps exact-match allowlist (2nd review finding)", () => {
  it("rejects an attacker-owned domain named 'google.<their-domain>'", () => {
    expect(isAllowedHost("google_maps", "google.evil.com")).toBe(false);
    expect(isAllowedHost("google_maps", "google.attacker.example")).toBe(false);
  });

  it("rejects a 'www.'-prefixed attacker-owned domain too", () => {
    expect(isAllowedHost("google_maps", "www.google.evil.com")).toBe(false);
  });

  it("still accepts the real hosts editors actually use", () => {
    expect(isAllowedHost("google_maps", "google.com")).toBe(true);
    expect(isAllowedHost("google_maps", "www.google.com")).toBe(true);
    expect(isAllowedHost("google_maps", "maps.google.com")).toBe(true);
  });

  it("still accepts a real ccTLD variant", () => {
    expect(isAllowedHost("google_maps", "google.co.uk")).toBe(true);
    expect(isAllowedHost("google_maps", "www.google.de")).toBe(true);
  });
});

describe("embed block schema — other field validation", () => {
  it("rejects an unsafe URL (javascript:)", () => {
    const result = embedBlock.schema.safeParse({
      ...base,
      provider: "youtube",
      url: "javascript:alert(1)",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unsafe URL (data:)", () => {
    const result = embedBlock.schema.safeParse({
      ...base,
      provider: "youtube",
      url: "data:text/html,<script>alert(1)</script>",
    });
    expect(result.success).toBe(false);
  });

  it("requires a non-empty title (the iframe's accessible name)", () => {
    const result = embedBlock.schema.safeParse({
      ...base,
      title: "",
      provider: "youtube",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    expect(result.success).toBe(false);
  });
});

describe("toEmbedSrc", () => {
  it("converts a YouTube watch URL to an embed URL", () => {
    expect(toEmbedSrc("youtube", "https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("converts a youtu.be short URL to an embed URL", () => {
    expect(toEmbedSrc("youtube", "https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("passes an already-embeddable YouTube URL through unchanged", () => {
    expect(toEmbedSrc("youtube", "https://www.youtube.com/embed/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("converts a Vimeo watch URL to a player URL", () => {
    expect(toEmbedSrc("vimeo", "https://vimeo.com/76979871")).toBe(
      "https://player.vimeo.com/video/76979871",
    );
  });

  it("appends output=embed to a plain Google Maps URL", () => {
    expect(toEmbedSrc("google_maps", "https://www.google.com/maps?q=Odessa+TX")).toBe(
      "https://www.google.com/maps?q=Odessa+TX&output=embed",
    );
  });

  it("leaves an already-embeddable Google Maps URL unchanged", () => {
    const embedUrl = "https://www.google.com/maps/embed?pb=!1m18";
    expect(toEmbedSrc("google_maps", embedUrl)).toBe(embedUrl);
  });

  it("fails closed (returns null, not the raw URL) for a right-host YouTube URL with no recognizable video", () => {
    expect(toEmbedSrc("youtube", "https://www.youtube.com/channel/UCxyz")).toBeNull();
  });

  it("fails closed for a right-host Google URL that isn't under /maps at all", () => {
    expect(toEmbedSrc("google_maps", "https://www.google.com/search?q=odessa")).toBeNull();
  });

  it("fails closed for a wrong-host URL even if it happens to match the video-id regex shape", () => {
    expect(toEmbedSrc("youtube", "https://attacker.example/watch?v=dQw4w9WgXcQ")).toBeNull();
  });

  it("fails closed for an unparseable URL", () => {
    expect(toEmbedSrc("youtube", "/pwn")).toBeNull();
  });
});

describe("embed block render", () => {
  function renderHtml(overrides: Partial<Parameters<typeof embedBlock.schema.parse>[0]> = {}) {
    const parsed = embedBlock.schema.parse({
      ...base,
      provider: "youtube",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      ...overrides,
    });
    const element = embedBlock.Render({ data: parsed }) as React.ReactElement | null;
    const html = element ? renderToStaticMarkup(element) : "";
    const container = document.createElement("div");
    container.innerHTML = html;
    return container.querySelector("iframe");
  }

  it("always renders a sandboxed iframe", () => {
    const iframe = renderHtml();
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("sandbox")).toBeTruthy();
  });

  it("uses the youtube sandbox value", () => {
    const iframe = renderHtml({ provider: "youtube" });
    expect(iframe?.getAttribute("sandbox")).toBe(
      "allow-scripts allow-same-origin allow-popups allow-presentation",
    );
  });

  it("uses a tighter sandbox value for google_maps (no allow-presentation)", () => {
    const iframe = renderHtml({ provider: "google_maps", url: "https://www.google.com/maps/embed?pb=1" });
    expect(iframe?.getAttribute("sandbox")).toBe("allow-scripts allow-same-origin allow-popups");
  });

  it("sets loading=lazy", () => {
    expect(renderHtml()?.getAttribute("loading")).toBe("lazy");
  });

  it("uses the block's title as the iframe's accessible name", () => {
    expect(renderHtml({ title: "Odessa Separator overview" })?.getAttribute("title")).toBe(
      "Odessa Separator overview",
    );
  });

  it("never uses dangerouslySetInnerHTML (no raw HTML in the rendered output beyond the iframe tag itself)", () => {
    const parsed = embedBlock.schema.parse({
      ...base,
      provider: "youtube",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    });
    const html = renderToStaticMarkup(embedBlock.Render({ data: parsed }) as React.ReactElement);
    // A dangerouslySetInnerHTML-driven embed would typically inline a
    // <script> or a provider's own markup blob; this render should be
    // exactly one <iframe> and nothing else executable.
    expect(html.match(/<iframe/g)?.length).toBe(1);
    expect(html).not.toContain("<script");
  });
});
