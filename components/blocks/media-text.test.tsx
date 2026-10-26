import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { mediaTextBlock } from "@/components/blocks/media-text";

const Render = mediaTextBlock.Render as (props: { data: unknown }) => React.ReactElement | null;
const base = { background: "cream", spacingTop: "md", spacingBottom: "md" };
const render = (data: Record<string, unknown>) => renderToStaticMarkup(<Render data={mediaTextBlock.schema.parse({ ...base, ...data })} />);

describe("media_text", () => {
  it("renders a video with its paragraphs and splits them on blank lines", () => {
    const html = render({ videoUrl: "https://www.youtube.com/embed/abc", body: "One.\n\nTwo." });
    expect(html).toContain('aria-label="Play video"');
    expect(html).toContain("<p>One.</p>");
    expect(html).toContain("<p>Two.</p>");
    expect(html).toContain("md:grid-cols-2");
  });

  it("stacks media above text for the media-above layout", () => {
    const html = render({ videoUrl: "https://www.youtube.com/embed/abc", body: "Text", layout: "media-above" });
    expect(html).not.toContain("md:grid-cols-2");
    expect(html.indexOf("Play video")).toBeLessThan(html.indexOf("Text"));
  });

  it("media-right keeps the media first in source order (mobile stack) and reorders from md", () => {
    const html = render({ videoUrl: "https://www.youtube.com/embed/abc", body: "Text", layout: "media-right" });
    expect(html).toContain("md:order-2");
    expect(html.indexOf("Play video")).toBeLessThan(html.indexOf("Text"));
  });

  it("renders no heading when the title is empty", () => {
    expect(render({ videoUrl: "https://www.youtube.com/embed/abc", title: "" })).not.toContain("<h2");
    expect(render({ videoUrl: "https://www.youtube.com/embed/abc", title: "How It Works" })).toContain(">How It Works</h2>");
  });

  it("requires alt text for an image", () => {
    expect(mediaTextBlock.schema.safeParse({ ...base, mediaType: "image", imageUrl: "https://x/y.png" }).success).toBe(false);
    expect(mediaTextBlock.schema.safeParse({ ...base, mediaType: "image", imageUrl: "https://x/y.png", imageAlt: "Sizes table" }).success).toBe(true);
  });

  it("renders nothing when it has no media, text or heading", () => {
    expect(render({})).toBe("");
  });
});
