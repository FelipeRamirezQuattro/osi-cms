import { describe, expect, it } from "vitest";
import { emailBlockRegistry, getEmailBlockPalette, validateEmailBlocks } from "@/lib/email-blocks/registry";

const doc = (text: string) => ({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text }] }],
});

describe("validateEmailBlocks", () => {
  it("accepts a well-formed set and fills schema defaults", () => {
    const result = validateEmailBlocks([
      { type: "heading", data: { text: "Hello" } },
      { type: "text", data: { content: doc("Body") } },
      { type: "button", data: { label: "Go", href: "/products" } },
      { type: "divider", data: {} },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.blocks[0]).toEqual({ type: "heading", data: { text: "Hello", size: "large", align: "left" } });
  });

  it("rejects an unknown block type, naming its position", () => {
    const result = validateEmailBlocks([{ type: "heading", data: { text: "ok" } }, { type: "carousel", data: {} }]);
    expect(result).toMatchObject({ ok: false, index: 1 });
  });

  it("rejects a non-array", () => {
    expect(validateEmailBlocks({ type: "heading" }).ok).toBe(false);
  });

  it("names the block and field of the first problem", () => {
    const result = validateEmailBlocks([{ type: "heading", data: { text: "" } }]);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("Heading");
      expect(result.message).toContain("text");
    }
  });

  it("requires alt text on an image and on a card image", () => {
    expect(validateEmailBlocks([{ type: "image", data: { src: "https://x.test/a.jpg", alt: "" } }]).ok).toBe(false);
    expect(
      validateEmailBlocks([{ type: "article_card", data: { title: "T", href: "/news/x", imageUrl: "https://x.test/a.jpg", imageAlt: "" } }]).ok,
    ).toBe(false);
    expect(validateEmailBlocks([{ type: "article_card", data: { title: "T", href: "/news/x" } }]).ok).toBe(true);
  });

  it("rejects unsafe links in buttons, images and cards", () => {
    expect(validateEmailBlocks([{ type: "button", data: { label: "x", href: "javascript:alert(1)" } }]).ok).toBe(false);
    expect(validateEmailBlocks([{ type: "image", data: { src: "https://x.test/a.jpg", alt: "a", href: "data:text/html,x" } }]).ok).toBe(false);
    expect(validateEmailBlocks([{ type: "article_card", data: { title: "T", href: "//evil.test" } }]).ok).toBe(false);
  });
});

describe("email block palette", () => {
  it("lists every registered block with plain, serializable data", () => {
    const palette = getEmailBlockPalette();
    expect(palette.map((entry) => entry.type).sort()).toEqual(Object.keys(emailBlockRegistry).sort());
    expect(() => JSON.stringify(palette)).not.toThrow();
  });

  it("gives every block defaults that a fresh editor row can start from", () => {
    for (const entry of getEmailBlockPalette()) expect(typeof entry.defaults).toBe("object");
  });
});
