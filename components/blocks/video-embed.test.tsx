import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { VideoEmbedRender, toEmbedUrl } from "@/components/blocks/video-embed-client";
import type { VideoEmbedData } from "@/components/blocks/video-embed";

/**
 * Task 7 item #3: products.video_url was stored but never rendered
 * anywhere. The product detail page now feeds it straight through the
 * existing VideoEmbedRender (no new video-safety logic reinvented) — this
 * covers the "hidden entirely when unset" behavior the product page
 * relies on, plus that a set URL actually renders a play control.
 */

const base: VideoEmbedData = {
  background: "cream",
  spacingTop: "md",
  spacingBottom: "md",
  title: undefined,
  videoUrl: null,
  posterImageUrl: undefined,
};

describe("VideoEmbedRender", () => {
  it("renders nothing when videoUrl is unset (e.g. a product with no legacy video)", () => {
    expect(renderToStaticMarkup(<VideoEmbedRender data={{ ...base, videoUrl: null }} />)).toBe("");
  });

  it("renders a play control when videoUrl is set", () => {
    const html = renderToStaticMarkup(
      <VideoEmbedRender data={{ ...base, videoUrl: "https://www.youtube.com/watch?v=abc123" }} />,
    );
    const container = document.createElement("div");
    container.innerHTML = html;
    expect(container.querySelector('button[aria-label="Play video"]')).not.toBeNull();
  });
});

describe("toEmbedUrl", () => {
  it("starts playback right after the poster click for the imported Wix /embed/ URLs (autoplay=0 → 1)", () => {
    expect(
      toEmbedUrl("https://www.youtube.com/embed/HgCM4Qu9Rpc?wmode=transparent&autoplay=0&mute=0&theme=dark&controls=1"),
    ).toBe("https://www.youtube.com/embed/HgCM4Qu9Rpc?autoplay=1&rel=0");
  });
  it("still converts watch and short links, and passes anything else through", () => {
    expect(toEmbedUrl("https://youtu.be/abc123")).toBe("https://www.youtube.com/embed/abc123?autoplay=1");
    expect(toEmbedUrl("https://example.com/v")).toBe("https://example.com/v");
  });
});
