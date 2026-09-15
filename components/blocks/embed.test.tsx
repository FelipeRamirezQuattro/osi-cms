import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { embedBlock, toEmbedSrc } from "@/components/blocks/embed";

/**
 * Task 9's highest-scrutiny item. Covers: the provider allowlist (only
 * youtube/vimeo/google_maps validate), URL safety (safeHrefSchema
 * rejects javascript:/data:), the YouTube/Vimeo/Maps URL transforms,
 * and — the specific thing the brief called out — that the rendered
 * iframe always carries a `sandbox` attribute and never
 * `dangerouslySetInnerHTML`.
 */

const base = {
  background: "cream" as const,
  spacingTop: "md" as const,
  spacingBottom: "md" as const,
  title: "Product overview video",
  aspectRatio: "16:9" as const,
};

describe("embed block schema", () => {
  it("accepts each allowlisted provider", () => {
    for (const provider of ["youtube", "vimeo", "google_maps"] as const) {
      const result = embedBlock.schema.safeParse({ ...base, provider, url: "https://example.com/embed" });
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

  it("falls through unchanged when a URL doesn't match its provider's pattern", () => {
    expect(toEmbedSrc("youtube", "https://example.com/not-a-video")).toBe(
      "https://example.com/not-a-video",
    );
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
    const html = renderToStaticMarkup(embedBlock.Render({ data: parsed }) as React.ReactElement);
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
