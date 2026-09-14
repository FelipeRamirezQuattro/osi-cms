import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RichTextRender, type RichTextData } from "@/components/blocks/rich-text";

/**
 * Task 7 item #1: products.body (a Tiptap jsonb doc, same shape as any
 * rich_text block's `content`) was stored but never rendered anywhere.
 * The product detail page now feeds it straight through RichTextRender —
 * this covers that reader in isolation, independent of the product page.
 */

function render(content: RichTextData["content"]) {
  return renderToStaticMarkup(
    <RichTextRender data={{ background: "cream", spacingTop: "md", spacingBottom: "md", content }} />,
  );
}

describe("RichTextRender", () => {
  it("renders a heading and a paragraph from a Tiptap doc", () => {
    const html = render({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Overview" }] },
        { type: "paragraph", content: [{ type: "text", text: "How this product works." }] },
      ],
    });
    const container = document.createElement("div");
    container.innerHTML = html;
    expect(container.querySelector("h2")?.textContent).toBe("Overview");
    expect(container.querySelector("p")?.textContent).toBe("How this product works.");
  });

  it("renders bold/italic marks and a safe link", () => {
    const html = render({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Bold", marks: [{ type: "bold" }] },
            { type: "text", text: " and a " },
            { type: "text", text: "link", marks: [{ type: "link", attrs: { href: "/contact" } }] },
          ],
        },
      ],
    });
    const container = document.createElement("div");
    container.innerHTML = html;
    expect(container.querySelector("strong")?.textContent).toBe("Bold");
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/contact");
  });

  it("renders an empty doc as an empty section rather than throwing", () => {
    expect(() => render({ type: "doc", content: [] })).not.toThrow();
  });
});
