import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { VideoEmbedRender } from "@/components/blocks/video-embed-client";
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
