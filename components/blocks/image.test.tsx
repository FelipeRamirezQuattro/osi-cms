import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { imageBlock } from "@/components/blocks/image";

/**
 * Task 9: the `image` block's one genuinely new schema behavior is the
 * decorative/alt toggle — `alt` is required (non-empty) unless
 * `decorative` is true, in which case Render must force alt="" even if
 * a stray alt value is present in stored data.
 */

const base = {
  background: "cream" as const,
  spacingTop: "md" as const,
  spacingBottom: "md" as const,
  imageUrl: "https://example.com/photo.jpg",
  decorative: false,
  caption: undefined,
  credit: undefined,
  aspectRatio: "16:9" as const,
  alignment: "center" as const,
  focalPoint: "center" as const,
  href: null,
};

describe("image block schema", () => {
  it("requires non-empty alt text when not decorative", () => {
    const result = imageBlock.schema.safeParse({ ...base, alt: "" });
    expect(result.success).toBe(false);
  });

  it("accepts a set alt when not decorative", () => {
    const result = imageBlock.schema.safeParse({ ...base, alt: "A gas separator in the field" });
    expect(result.success).toBe(true);
  });

  it("does not require alt when decorative is true", () => {
    const result = imageBlock.schema.safeParse({ ...base, decorative: true, alt: undefined });
    expect(result.success).toBe(true);
  });

  it("rejects a missing image URL", () => {
    const result = imageBlock.schema.safeParse({ ...base, imageUrl: "", alt: "Alt" });
    expect(result.success).toBe(false);
  });

  it("rejects an unsafe link", () => {
    const result = imageBlock.schema.safeParse({ ...base, alt: "Alt", href: "javascript:alert(1)" });
    expect(result.success).toBe(false);
  });
});

describe("image block render", () => {
  it("renders alt='' when decorative, even if a stray alt value is stored", () => {
    const parsed = imageBlock.schema.parse({ ...base, decorative: true, alt: "should be ignored" });
    const html = renderToStaticMarkup(imageBlock.Render({ data: parsed }) as React.ReactElement);
    const container = document.createElement("div");
    container.innerHTML = html;
    const img = container.querySelector("img");
    expect(img?.getAttribute("alt")).toBe("");
  });

  it("renders the real alt text when not decorative", () => {
    const parsed = imageBlock.schema.parse({ ...base, alt: "A gas separator in the field" });
    const html = renderToStaticMarkup(imageBlock.Render({ data: parsed }) as React.ReactElement);
    const container = document.createElement("div");
    container.innerHTML = html;
    const img = container.querySelector("img");
    expect(img?.getAttribute("alt")).toBe("A gas separator in the field");
  });

  it("wraps the image in a link when href is set", () => {
    const parsed = imageBlock.schema.parse({ ...base, alt: "Alt", href: "/products" });
    const html = renderToStaticMarkup(imageBlock.Render({ data: parsed }) as React.ReactElement);
    const container = document.createElement("div");
    container.innerHTML = html;
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/products");
  });
});
