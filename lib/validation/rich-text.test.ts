import { describe, expect, it } from "vitest";
import { tiptapDocSchema } from "@/lib/validation/rich-text";

/**
 * The lockstep triangle documented in components/blocks/rich-text.tsx and
 * components/admin/rich-text-editor.tsx: this schema must accept every
 * node/mark the editor's StarterKit config can produce and the reader's
 * renderNode/renderMarks can render, and reject everything else.
 */

function doc(content: unknown[]) {
  return { type: "doc", content };
}

describe("tiptapDocSchema — accepts every reader-supported node/mark", () => {
  it("accepts a paragraph with bold/italic/link marks", () => {
    const result = tiptapDocSchema.safeParse(
      doc([
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hello ", marks: [{ type: "bold" }] },
            { type: "text", text: "world", marks: [{ type: "italic" }] },
            { type: "text", text: "link", marks: [{ type: "link", attrs: { href: "/contact" } }] },
          ],
        },
      ]),
    );
    expect(result.success).toBe(true);
  });

  it("accepts heading levels 2 and 3", () => {
    for (const level of [2, 3]) {
      const result = tiptapDocSchema.safeParse(
        doc([{ type: "heading", attrs: { level }, content: [{ type: "text", text: "Section" }] }]),
      );
      expect(result.success).toBe(true);
    }
  });

  it("accepts bulletList and orderedList wrapping listItem/paragraph", () => {
    const bulleted = doc([
      { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "a" }] }] }] },
    ]);
    const ordered = doc([
      {
        type: "orderedList",
        attrs: { start: 3 },
        content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "b" }] }] }],
      },
    ]);
    expect(tiptapDocSchema.safeParse(bulleted).success).toBe(true);
    expect(tiptapDocSchema.safeParse(ordered).success).toBe(true);
  });

  it("accepts an empty paragraph and an empty doc", () => {
    expect(tiptapDocSchema.safeParse(doc([{ type: "paragraph" }])).success).toBe(true);
    expect(tiptapDocSchema.safeParse(doc([])).success).toBe(true);
  });
});

describe("tiptapDocSchema — rejects everything StarterKit disables or the reader can't render", () => {
  it("rejects an H1 (heading levels are capped to [2, 3])", () => {
    const result = tiptapDocSchema.safeParse(doc([{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "x" }] }]));
    expect(result.success).toBe(false);
  });

  it("rejects a blockquote node", () => {
    const result = tiptapDocSchema.safeParse(doc([{ type: "blockquote", content: [] }]));
    expect(result.success).toBe(false);
  });

  it("rejects a codeBlock node", () => {
    const result = tiptapDocSchema.safeParse(doc([{ type: "codeBlock", content: [{ type: "text", text: "x" }] }]));
    expect(result.success).toBe(false);
  });

  it("rejects a horizontalRule node", () => {
    const result = tiptapDocSchema.safeParse(doc([{ type: "horizontalRule" }]));
    expect(result.success).toBe(false);
  });

  it("rejects a strike or code mark", () => {
    const strike = doc([{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "strike" }] }] }]);
    const code = doc([{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "code" }] }] }]);
    expect(tiptapDocSchema.safeParse(strike).success).toBe(false);
    expect(tiptapDocSchema.safeParse(code).success).toBe(false);
  });

  it("rejects a link mark whose href is unsafe", () => {
    const result = tiptapDocSchema.safeParse(
      doc([{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] }]),
    );
    expect(result.success).toBe(false);
  });

  it("rejects a doc that isn't type 'doc'", () => {
    expect(tiptapDocSchema.safeParse({ type: "not-a-doc", content: [] }).success).toBe(false);
  });
});
