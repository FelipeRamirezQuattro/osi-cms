import type { CSSProperties, ReactNode } from "react";
import { EMAIL } from "@/components/email/email-styles";
import type { EmailBlockContext } from "@/lib/email-blocks/types";
import type { TiptapDoc } from "@/lib/validation/rich-text";

// Email counterpart of components/blocks/rich-text.tsx's reader. Same
// restricted document (paragraph, h2/h3, bullet/ordered lists, bold, italic,
// link — exactly what components/admin/rich-text-editor.tsx can produce),
// rendered with inline styles because email clients drop external CSS.
interface Mark {
  type: string;
  attrs?: Record<string, unknown>;
}
interface Node {
  type: string;
  text?: string;
  marks?: Mark[];
  content?: Node[];
  attrs?: { level?: number };
}

const paragraph: CSSProperties = { margin: "0 0 16px", fontSize: 16, lineHeight: "26px", color: EMAIL.ink, fontFamily: EMAIL.font };
const heading: CSSProperties = { margin: "24px 0 12px", color: EMAIL.navy, fontFamily: EMAIL.font, fontWeight: 700 };
const list: CSSProperties = { margin: "0 0 16px", paddingLeft: 24, fontSize: 16, lineHeight: "26px", color: EMAIL.ink, fontFamily: EMAIL.font };

function marks(text: string, list: Mark[] = [], ctx: EmailBlockContext): ReactNode {
  return list.reduce<ReactNode>((node, mark) => {
    if (mark.type === "bold") return <strong>{node}</strong>;
    if (mark.type === "italic") return <em>{node}</em>;
    if (mark.type === "link") {
      const href = typeof mark.attrs?.href === "string" ? mark.attrs.href : "";
      return href ? (
        <a href={ctx.resolveUrl(href)} style={{ color: EMAIL.navy, textDecoration: "underline" }}>
          {node}
        </a>
      ) : (
        node
      );
    }
    return node;
  }, text);
}

function renderNode(node: Node, key: number, ctx: EmailBlockContext): ReactNode {
  const children = () => node.content?.map((child, i) => renderNode(child, i, ctx));
  switch (node.type) {
    case "text":
      return <span key={key}>{marks(node.text ?? "", node.marks, ctx)}</span>;
    case "paragraph":
      return (
        <p key={key} style={paragraph}>
          {children()}
        </p>
      );
    case "heading":
      return node.attrs?.level === 3 ? (
        <h3 key={key} style={{ ...heading, fontSize: 18, lineHeight: "26px" }}>
          {children()}
        </h3>
      ) : (
        <h2 key={key} style={{ ...heading, fontSize: 22, lineHeight: "30px" }}>
          {children()}
        </h2>
      );
    case "bulletList":
      return (
        <ul key={key} style={list}>
          {children()}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} style={list}>
          {children()}
        </ol>
      );
    case "listItem":
      return <li key={key}>{children()}</li>;
    default:
      return null;
  }
}

export function RichTextEmail({ doc, ctx }: { doc: TiptapDoc; ctx: EmailBlockContext }) {
  return <>{(doc.content as Node[]).map((node, i) => renderNode(node, i, ctx))}</>;
}
