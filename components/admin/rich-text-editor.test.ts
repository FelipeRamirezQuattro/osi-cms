import { describe, expect, it, afterEach } from "vitest";
import { Editor } from "@tiptap/react";
import { richTextExtensions } from "@/components/admin/rich-text-editor";
import { tiptapDocSchema } from "@/lib/validation/rich-text";

/**
 * The bug this covers: rich-text-editor.tsx's top comment claimed
 * "Everything else in StarterKit is disabled", but StarterKit (Tiptap v3)
 * also bundles HardBreak (Shift+Enter, no toolbar button) and Underline
 * (Ctrl/Cmd+U, no toolbar button) enabled by default — neither was
 * actually turned off, so an editor could trivially produce a doc
 * lib/validation/rich-text.ts's tiptapDocSchema (correctly, per its own
 * restricted design) rejects at save time. That's real content getting
 * wrongly blocked, not malformed content getting correctly blocked.
 *
 * This builds a real, headless tiptap `Editor` (re-exported by
 * `@tiptap/react`, an existing direct dependency — `@tiptap/core` itself
 * is only a transitive one) from richTextExtensions() — the *exact*
 * array the live RichTextEditor component registers, not a hand-copied
 * duplicate of it — so a future
 * regression here (e.g. someone adding a new StarterKit node/mark back
 * without updating this file) fails this test rather than silently
 * reintroducing the same class of bug.
 */

function makeEditor(content?: unknown) {
  return new Editor({ extensions: richTextExtensions(), content: content as never });
}

describe("richTextExtensions — matches the restricted set the schema/reader assume", () => {
  let editor: Editor | undefined;
  afterEach(() => {
    editor?.destroy();
    editor = undefined;
  });

  // A disabled StarterKit sub-extension doesn't register its command at
  // all — `.can().setHardBreak` etc. isn't a "false-returning function",
  // it's simply undefined. That's an even stronger guarantee than a
  // command reporting itself unavailable: there is no code path in the
  // real editor that can reach that node/mark type, full stop.
  function commandExists(name: string): boolean {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return typeof (editor!.can() as any)[name] === "function";
  }

  it("cannot produce a hard break or underline mark (both disabled, unlike StarterKit's own defaults)", () => {
    editor = makeEditor();
    expect(commandExists("setHardBreak")).toBe(false);
    expect(commandExists("toggleUnderline")).toBe(false);
  });

  it("cannot produce a blockquote, codeBlock, horizontalRule, strike, or inline code (all explicitly disabled)", () => {
    editor = makeEditor();
    expect(commandExists("toggleBlockquote")).toBe(false);
    expect(commandExists("toggleCodeBlock")).toBe(false);
    expect(commandExists("setHorizontalRule")).toBe(false);
    expect(commandExists("toggleStrike")).toBe(false);
    expect(commandExists("toggleCode")).toBe(false);
  });

  it("still allows every mark/node the toolbar and the reader actually support", () => {
    editor = makeEditor();
    expect(editor.can().toggleBold()).toBe(true);
    expect(editor.can().toggleItalic()).toBe(true);
    expect(editor.can().toggleBulletList()).toBe(true);
    expect(editor.can().toggleOrderedList()).toBe(true);
    expect(editor.can().toggleHeading({ level: 2 })).toBe(true);
    expect(editor.can().toggleHeading({ level: 3 })).toBe(true);
    expect(editor.can().setLink({ href: "/contact" })).toBe(true);
  });

  it("only accepts heading levels 2 and 3, matching tiptapDocSchema", () => {
    editor = makeEditor();
    expect(editor.can().toggleHeading({ level: 1 })).toBe(false);
  });

  it("round-trips a doc built from every allowed node/mark through tiptapDocSchema successfully", () => {
    editor = makeEditor({
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Heading" }] },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Bold ", marks: [{ type: "bold" }] },
            { type: "text", text: "italic ", marks: [{ type: "italic" }] },
            { type: "text", text: "link", marks: [{ type: "link", attrs: { href: "/contact" } }] },
          ],
        },
        {
          type: "bulletList",
          content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "item" }] }] }],
        },
      ],
    });
    const result = tiptapDocSchema.safeParse(editor.getJSON());
    expect(result.success).toBe(true);
  });

  it("a real Shift+Enter/Ctrl+U interaction is impossible, so the editor can never hand the schema a hardBreak/underline node it would reject", () => {
    editor = makeEditor({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "line" }] }] });
    // setHardBreak()/toggleUnderline() are the exact commands StarterKit
    // binds Shift+Enter/Ctrl+U to — neither exists on this editor's chain
    // at all (see commandExists above), so the keyboard shortcut has
    // nothing to invoke; the doc that results from ordinary typing still
    // round-trips through the schema.
    expect(commandExists("setHardBreak")).toBe(false);
    expect(commandExists("toggleUnderline")).toBe(false);
    const result = tiptapDocSchema.safeParse(editor.getJSON());
    expect(result.success).toBe(true);
  });
});
