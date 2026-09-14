import { z } from "zod";
import { safeHrefSchema } from "@/lib/validation/common";

/**
 * Server-side schema for the Tiptap JSON doc stored in `rich_text`
 * blocks' `content` field (and `products.body`/`news_posts.body`) —
 * replaces `content: z.any()` in components/blocks/rich-text.tsx. This is
 * the third leg of the lockstep documented there and in
 * components/admin/rich-text-editor.tsx: the editor's StarterKit config
 * (blockquote/codeBlock/horizontalRule/strike/code disabled, heading
 * capped to [2, 3]) decides what CAN be produced, the reader
 * (components/blocks/rich-text.tsx's renderNode/renderMarks) decides
 * what CAN be rendered, and this schema must accept exactly their
 * intersection and reject everything else — an H1, a blockquote, a
 * codeBlock, a strike mark, all fail here even though they're valid
 * generic Tiptap/ProseMirror output.
 *
 * Lives in lib/validation/ rather than one of the 7 domain files (Task 6
 * brief's file list) since it isn't really a "mutation input" for one
 * entity — pages/products/news_posts/rich_text blocks all embed the same
 * doc shape as one field among others.
 */

const textMarkSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bold") }).loose(),
  z.object({ type: z.literal("italic") }).loose(),
  z.object({
    type: z.literal("link"),
    attrs: z.object({ href: safeHrefSchema({ allowAnchor: true, allowContact: true, label: "Link" }) }).loose(),
  }),
]);

const textNodeSchema = z.object({
  type: z.literal("text"),
  // Tiptap never emits an empty text node, but tolerate it rather than
  // reject a doc over it — this schema's job is to keep out unsupported
  // node/mark *types*, not to re-litigate Tiptap's own invariants.
  text: z.string(),
  marks: z.array(textMarkSchema).optional(),
});

// Recursive node union — paragraph/heading/listItem all nest further
// nodes, hence z.lazy(). Kept as an explicit interface (mirrors
// components/blocks/rich-text.tsx's own TiptapNode) so the recursive
// z.lazy() reference has a concrete type instead of inferring `any`.
type ParagraphNode = { type: "paragraph"; content?: TextNode[] };
type TextNode = z.infer<typeof textNodeSchema>;
type HeadingNode = { type: "heading"; attrs?: { level?: 2 | 3 }; content?: TextNode[] };
type ListItemNode = { type: "listItem"; content?: (ParagraphNode | BulletListNode | OrderedListNode)[] };
type BulletListNode = { type: "bulletList"; content?: ListItemNode[] };
type OrderedListNode = { type: "orderedList"; attrs?: { start?: number }; content?: ListItemNode[] };
export type TiptapBlockNode = ParagraphNode | HeadingNode | BulletListNode | OrderedListNode;

// Inline content (paragraph/heading): plain text runs only — the editor
// has no other inline node types enabled (no hard break, no image).
const inlineContentSchema = z.array(textNodeSchema).optional();

const paragraphSchema: z.ZodType<ParagraphNode> = z.object({
  type: z.literal("paragraph"),
  content: inlineContentSchema,
});

const headingSchema: z.ZodType<HeadingNode> = z.object({
  type: z.literal("heading"),
  // StarterKit is configured with `heading: { levels: [2, 3] }` — an H1
  // (or any other level) is something the editor cannot produce, so it's
  // rejected here rather than silently downgraded.
  attrs: z.object({ level: z.union([z.literal(2), z.literal(3)]) }).loose().optional(),
  content: inlineContentSchema,
});

const listItemSchema: z.ZodType<ListItemNode> = z.lazy(() =>
  z.object({
    type: z.literal("listItem"),
    content: z.array(z.union([paragraphSchema, bulletListSchema, orderedListSchema])).optional(),
  }),
);

const bulletListSchema: z.ZodType<BulletListNode> = z.lazy(() =>
  z.object({
    type: z.literal("bulletList"),
    content: z.array(listItemSchema).optional(),
  }),
);

const orderedListSchema: z.ZodType<OrderedListNode> = z.lazy(() =>
  z.object({
    type: z.literal("orderedList"),
    // Tiptap's OrderedList extension carries a `start` attr (default 1)
    // even though the reader (rich-text.tsx) doesn't currently use it —
    // accepted here so a real editor-produced doc with `start` set isn't
    // rejected outright.
    attrs: z.object({ start: z.number().int().positive().optional() }).loose().optional(),
    content: z.array(listItemSchema).optional(),
  }),
);

const blockNodeSchema: z.ZodType<TiptapBlockNode> = z.union([
  paragraphSchema,
  headingSchema,
  bulletListSchema,
  orderedListSchema,
]);

export const tiptapDocSchema = z.object({
  type: z.literal("doc"),
  content: z.array(blockNodeSchema).default([]),
});

export type TiptapDoc = z.infer<typeof tiptapDocSchema>;
