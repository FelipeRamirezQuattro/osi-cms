import { Fragment } from "react";
import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { tiptapDocSchema } from "@/lib/validation/rich-text";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

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
        <a href={(mark.attrs?.href as string) ?? "#"} className="font-semibold underline decoration-osi-gold-700/60 underline-offset-4 hover:decoration-current">
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
        <p key={key} className="mb-5 leading-[1.8]">
          {node.content?.map(renderNode)}
        </p>
      );
    case "heading": {
      const Tag = node.attrs?.level === 3 ? "h3" : "h2";
      return (
        <Tag key={key} className="mt-10 mb-4 font-editorial text-[clamp(1.4rem,3vw,2rem)] font-semibold leading-tight text-balance">
          {node.content?.map(renderNode)}
        </Tag>
      );
    }
    case "bulletList":
      return (
        <ul key={key} className="mb-5 list-disc space-y-2 pl-6 marker:text-osi-gold-700">
          {node.content?.map(renderNode)}
        </ul>
      );
    case "orderedList":
      return (
        <ol key={key} className="mb-5 list-decimal space-y-2 pl-6 marker:font-semibold marker:text-osi-gold-700">
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
  content: tiptapDocSchema,
});

export type RichTextData = z.infer<typeof schema>;
type Data = RichTextData;

// Exported (not just used via richTextBlock.Render) so the product detail
// page (app/(site)/products/[category]/[slug]/page.tsx) can render
// products.body directly — same pattern as ProductHeroRender/
// BenefitsCardsRender/etc. there (see CLAUDE.md's "Product detail pages
// don't use page_blocks").
export function RichTextRender({ data }: { data: Data }) {
  const doc = data.content as TiptapNode | undefined;
  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
      contentClassName="mx-auto max-w-[var(--site-reading-width)] px-5 md:px-10"
    >
      <div className="text-base leading-relaxed">{doc?.content?.map(renderNode)}</div>
    </Section>
  );
}

const adminFields: FieldSpec[] = [{ key: "content", label: "Content", type: "richtext" }];

export const richTextBlock = defineBlock({
  type: "rich_text",
  label: "Rich text",
  category: "content",
  description: "Tiptap-authored prose (paragraphs, H2/H3, lists, bold/italic/links) — the default block for migrated legacy page copy and any free-form written content.",
  schema,
  adminFields,
  defaults: { background: "cream", spacingTop: "md", spacingBottom: "md", content: { type: "doc", content: [] } },
  Render: RichTextRender,
});
