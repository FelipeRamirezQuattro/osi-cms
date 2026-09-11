import { Fragment } from "react";
import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";

// Minimal reader for Tiptap's JSON doc format, restricted to the
// admin's allowed toolbar (bold, italic, lists, links, H2/H3 — see
// master prompt stack table). The editor itself (Tiptap the library)
// is a Phase 5 concern; this only needs to read what it produces.
interface TiptapMark {
  type: string;
  attrs?: Record<string, unknown>;
}
interface TiptapNode {
  type: string;
  text?: string;
  marks?: TiptapMark[];
  content?: TiptapNode[];
  attrs?: { level?: number };
}

function renderMarks(text: string, marks: TiptapMark[] = []): React.ReactNode {
  return marks.reduce<React.ReactNode>((node, mark) => {
    if (mark.type === "bold") return <strong>{node}</strong>;
    if (mark.type === "italic") return <em>{node}</em>;
    if (mark.type === "link") {
      return (
        <a href={(mark.attrs?.href as string) ?? "#"} className="underline">
          {node}
        </a>
      );
    }
    return node;
  }, text);
}

function renderNode(node: TiptapNode, key: number): React.ReactNode {
  switch (node.type) {
    case "text":
      return <Fragment key={key}>{renderMarks(node.text ?? "", node.marks)}</Fragment>;
    case "paragraph":
      return (
        <p key={key} className="mb-4">
          {node.content?.map(renderNode)}
        </p>
      );
    case "heading": {
      const Tag = node.attrs?.level === 3 ? "h3" : "h2";
      return (
        <Tag key={key} className="mt-8 mb-4 font-display text-card-label tracking-wide-display uppercase">
          {node.content?.map(renderNode)}
        </Tag>
      );
    }
    case "bulletList":
      return (
        <ul key={key} className="mb-4 list-disc space-y-1 pl-6">
          {node.content?.map(renderNode)}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="mb-4 list-decimal space-y-1 pl-6">
          {node.content?.map(renderNode)}
        </ol>
      );
    case "listItem":
      return <li key={key}>{node.content?.map(renderNode)}</li>;
    default:
      return null;
  }
}

const schema = blockCommonSchema.extend({
  content: z.any(),
});

type Data = z.infer<typeof schema>;

function Render({ data }: { data: Data }) {
  const doc = data.content as TiptapNode | undefined;
  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      contentClassName="mx-auto max-w-3xl px-6 md:px-12"
    >
      <div className="text-base">{doc?.content?.map(renderNode)}</div>
    </Section>
  );
}

export const richTextBlock = defineBlock({
  type: "rich_text",
  label: "Rich text",
  category: "content",
  schema,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md", content: { type: "doc", content: [] } },
  Render,
});
