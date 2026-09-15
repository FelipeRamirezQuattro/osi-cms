import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { columnsBlock } from "@/components/blocks/columns";

/**
 * Task 9: `columns` is a Zod discriminated union of exactly one
 * text/image/cta item per column, 2-3 columns, no recursive nesting.
 */

const base = { background: "cream" as const, spacingTop: "md" as const, spacingBottom: "md" as const };

describe("columns block schema", () => {
  it("accepts 2 text columns", () => {
    const result = columnsBlock.schema.safeParse({
      ...base,
      columns: [
        { type: "text", heading: "One", body: "Body one" },
        { type: "text", heading: "Two" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a mix of text/image/cta across 3 columns", () => {
    const result = columnsBlock.schema.safeParse({
      ...base,
      columns: [
        { type: "text", heading: "One" },
        { type: "image", imageUrl: "https://example.com/a.jpg", imageAlt: "Alt" },
        { type: "cta", ctaLabel: "Learn more", ctaHref: "/products" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects fewer than 2 columns", () => {
    const result = columnsBlock.schema.safeParse({ ...base, columns: [{ type: "text", heading: "Only one" }] });
    expect(result.success).toBe(false);
  });

  it("rejects more than 3 columns", () => {
    const result = columnsBlock.schema.safeParse({
      ...base,
      columns: [
        { type: "text", heading: "One" },
        { type: "text", heading: "Two" },
        { type: "text", heading: "Three" },
        { type: "text", heading: "Four" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown column type", () => {
    const result = columnsBlock.schema.safeParse({
      ...base,
      columns: [
        { type: "video", url: "https://example.com" },
        { type: "text", heading: "Two" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a text column with no heading", () => {
    const result = columnsBlock.schema.safeParse({
      ...base,
      columns: [
        { type: "text", heading: "" },
        { type: "text", heading: "Two" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unsafe cta href", () => {
    const result = columnsBlock.schema.safeParse({
      ...base,
      columns: [
        { type: "cta", ctaLabel: "Go", ctaHref: "javascript:alert(1)" },
        { type: "text", heading: "Two" },
      ],
    });
    expect(result.success).toBe(false);
  });
});

describe("columns block render", () => {
  it("renders a heading for a text column, an image for an image column, and a link for a cta column", () => {
    const parsed = columnsBlock.schema.parse({
      ...base,
      columns: [
        { type: "text", heading: "Text heading" },
        { type: "image", imageUrl: "https://example.com/a.jpg", imageAlt: "An image" },
        { type: "cta", ctaLabel: "Learn more", ctaHref: "/products" },
      ],
    });
    const html = renderToStaticMarkup(columnsBlock.Render({ data: parsed }) as React.ReactElement);
    const container = document.createElement("div");
    container.innerHTML = html;
    expect(container.textContent).toContain("Text heading");
    expect(container.querySelector("img")?.getAttribute("alt")).toBe("An image");
    expect(container.querySelector("a[href='/products']")?.textContent).toContain("Learn more");
  });
});
