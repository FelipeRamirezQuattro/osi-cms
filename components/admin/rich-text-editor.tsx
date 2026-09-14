"use client";

import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

// Restricted to the reader in components/blocks/rich-text.tsx: paragraph,
// heading (h2/h3), bulletList, orderedList, listItem, text with
// bold/italic/link marks. Everything else in StarterKit is disabled so an
// editor can never produce a doc the public site can't render.
const EMPTY_DOC: JSONContent = { type: "doc", content: [{ type: "paragraph" }] };

/**
 * The exact extension list the live editor below registers — pulled out
 * to a named export (rather than inlined in the `useEditor({...})` call)
 * so rich-text-editor.test.tsx can build a real, headless `@tiptap/core`
 * `Editor` from this *same* array and check what it can actually produce,
 * instead of a second, hand-copied "restricted set" that could silently
 * drift from this one the way the prose comment above already did once
 * (StarterKit's hardBreak/underline were left enabled despite this
 * comment's claim that "everything else... is disabled").
 */
export function richTextExtensions() {
  return [
    StarterKit.configure({
      blockquote: false,
      codeBlock: false,
      horizontalRule: false,
      strike: false,
      code: false,
      // StarterKit (Tiptap v3) also bundles HardBreak (Shift+Enter) and
      // Underline (Ctrl/Cmd+U) by default — neither is mentioned in the
      // restricted set this comment already documented, and neither has
      // a toolbar button here, but both are ordinary editor shortcuts a
      // user can trigger with no UI at all. Left enabled, they'd let the
      // editor produce a doc components/blocks/rich-text.tsx can't
      // render and lib/validation/rich-text.ts's tiptapDocSchema
      // rejects at save time — explicitly disabled here instead so the
      // three-way lockstep (this config / the schema / the reader) that
      // comment already calls out actually holds.
      hardBreak: false,
      underline: false,
      heading: { levels: [2, 3] },
      // StarterKit (Tiptap v3) bundles its own Link extension — disable
      // it here so the explicit Link.configure() below (openOnClick/
      // autolink) doesn't register twice under the same name.
      link: false,
    }),
    Link.configure({ openOnClick: false, autolink: true }),
  ];
}

function ToolbarButton({
  onClick,
  active,
  children,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`rounded px-2 py-1 text-xs uppercase tracking-wide-label ${
        active ? "bg-osi-navy-900 text-osi-white" : "border border-osi-sand-300"
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value,
  onChange,
}: {
  value: JSONContent | null | undefined;
  onChange: (doc: JSONContent) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: richTextExtensions(),
    content: value && value.content?.length ? value : EMPTY_DOC,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: {
      attributes: {
        class: "prose-sm min-h-[10rem] max-w-none px-3 py-2 text-sm",
      },
    },
  });

  if (!editor) return null;

  function setLink() {
    const previous = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  return (
    <div className="rounded border border-osi-sand-300">
      <div className="flex flex-wrap gap-1 border-b border-osi-sand-300 bg-osi-cream-100 p-2">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </ToolbarButton>
        <ToolbarButton
          label="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          H3
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          •—
        </ToolbarButton>
        <ToolbarButton
          label="Ordered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          1.—
        </ToolbarButton>
        <ToolbarButton label="Link" active={editor.isActive("link")} onClick={setLink}>
          Link
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
