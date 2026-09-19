/* eslint-disable @next/next/no-img-element -- email HTML: a plain <img> with absolute URLs is required; next/image needs the Next runtime an email client doesn't have */
import type { CSSProperties, ReactNode } from "react";
import { z } from "zod";
import { EMAIL } from "@/components/email/email-styles";
import { RichTextEmail } from "@/components/email/rich-text-email";
import type { FieldSpec } from "@/lib/blocks/admin-fields";
import { defineEmailBlock } from "@/lib/email-blocks/types";
import { safeHrefSchema } from "@/lib/validation/common";
import { tiptapDocSchema } from "@/lib/validation/rich-text";

/**
 * The email block set: heading, text, image, button, divider, article card.
 * One row of a presentation table per block — the layout email clients
 * (Outlook included) render reliably. The unsubscribe link and mailing
 * address are NOT blocks; they're part of the fixed footer in
 * newsletter-email.tsx so an editor can't leave them out.
 */

const ALIGN = ["left", "center"] as const;
const alignField: FieldSpec = { key: "align", label: "Alignment", type: "select", options: [...ALIGN] };

function Row({ children, padding = "0 32px 16px", align = "left" }: { children: ReactNode; padding?: string; align?: "left" | "center" }) {
  return (
    <tr>
      <td align={align} style={{ padding, textAlign: align }}>
        {children}
      </td>
    </tr>
  );
}

const title: CSSProperties = { margin: 0, color: EMAIL.navy, fontFamily: EMAIL.font, fontWeight: 700 };

// --- heading ------------------------------------------------------------------

const headingSchema = z.object({
  text: z.string().trim().min(1, "Heading text is required").max(200),
  size: z.enum(["large", "medium"]).default("large"),
  align: z.enum(ALIGN).default("left"),
});

export const emailHeadingBlock = defineEmailBlock({
  type: "heading",
  label: "Heading",
  description: "A section title. Use one large heading near the top, medium ones to break up longer emails.",
  schema: headingSchema,
  defaults: { text: "", size: "large", align: "left" } as z.infer<typeof headingSchema>,
  adminFields: [
    { key: "text", label: "Text", type: "text" },
    { key: "size", label: "Size", type: "select", options: ["large", "medium"] },
    alignField,
  ],
  Render: ({ data }) => (
    <Row align={data.align} padding="8px 32px 12px">
      <h1 style={{ ...title, fontSize: data.size === "large" ? 28 : 21, lineHeight: data.size === "large" ? "36px" : "28px" }}>{data.text}</h1>
    </Row>
  ),
});

// --- text ---------------------------------------------------------------------

const textSchema = z.object({ content: tiptapDocSchema });

export const emailTextBlock = defineEmailBlock({
  type: "text",
  label: "Text",
  description: "Body copy with bold, italic, links, lists and sub-headings.",
  schema: textSchema,
  defaults: { content: { type: "doc", content: [] } } as z.infer<typeof textSchema>,
  adminFields: [{ key: "content", label: "Content", type: "richtext" }],
  Render: ({ data, ctx }) => (
    <Row padding="0 32px 0">
      <RichTextEmail doc={data.content} ctx={ctx} />
    </Row>
  ),
});

// --- image --------------------------------------------------------------------

const imageSchema = z.object({
  src: z.string().trim().min(1, "Choose an image"),
  // Required for the same reason media uploads require it (accessibility, and
  // it is what shows when a client blocks images).
  alt: z.string().trim().min(1, "Describe the image for people who can't see it").max(300),
  href: z.preprocess((v) => (v === "" || v === undefined ? null : v), safeHrefSchema({ label: "Image link" }).nullable().default(null)),
});

export const emailImageBlock = defineEmailBlock({
  type: "image",
  label: "Image",
  description: "A full-width picture, optionally linking somewhere.",
  schema: imageSchema,
  defaults: { src: "", alt: "", href: null } as z.infer<typeof imageSchema>,
  adminFields: [
    { key: "src", label: "Image", type: "image" },
    { key: "alt", label: "Alt text", type: "text" },
    { key: "href", label: "Link (optional)", type: "text", optional: true },
  ],
  Render: ({ data, ctx }) => {
    const img = (
      <img
        src={ctx.resolveImage(data.src)}
        alt={data.alt}
        width={EMAIL.width - 64}
        style={{ display: "block", width: "100%", maxWidth: "100%", height: "auto", border: 0 }}
      />
    );
    return <Row padding="0 32px 16px">{data.href ? <a href={ctx.resolveUrl(data.href)}>{img}</a> : img}</Row>;
  },
});

// --- button -------------------------------------------------------------------

const buttonSchema = z.object({
  label: z.string().trim().min(1, "Button label is required").max(60),
  href: safeHrefSchema({ label: "Button link" }),
  align: z.enum(ALIGN).default("left"),
});

export const emailButtonBlock = defineEmailBlock({
  type: "button",
  label: "Button",
  description: "One clear call to action.",
  schema: buttonSchema,
  defaults: { label: "", href: "", align: "left" } as z.infer<typeof buttonSchema>,
  adminFields: [
    { key: "label", label: "Label", type: "text" },
    { key: "href", label: "Link", type: "text" },
    alignField,
  ],
  Render: ({ data, ctx }) => (
    <Row align={data.align} padding="8px 32px 24px">
      <a
        href={ctx.resolveUrl(data.href)}
        style={{
          display: "inline-block",
          padding: "12px 24px",
          backgroundColor: EMAIL.gold,
          color: EMAIL.navy,
          fontFamily: EMAIL.font,
          fontSize: 15,
          fontWeight: 700,
          textDecoration: "none",
          borderRadius: 4,
        }}
      >
        {data.label}
      </a>
    </Row>
  ),
});

// --- divider ------------------------------------------------------------------

export const emailDividerBlock = defineEmailBlock({
  type: "divider",
  label: "Divider",
  description: "A thin line between sections.",
  schema: z.object({}),
  defaults: {},
  adminFields: [],
  Render: () => (
    <Row padding="8px 32px 24px">
      <div style={{ height: 1, lineHeight: "1px", fontSize: 1, backgroundColor: EMAIL.rule }}>&nbsp;</div>
    </Row>
  ),
});

// --- article card -------------------------------------------------------------

const articleSchema = z.object({
  title: z.string().trim().min(1, "Card title is required").max(200),
  description: z.string().trim().max(500).default(""),
  imageUrl: z.string().trim().default(""),
  imageAlt: z.string().trim().max(300).default(""),
  linkLabel: z.string().trim().min(1).max(60).default("Read more"),
  href: safeHrefSchema({ label: "Card link" }),
}).refine((card) => !card.imageUrl || card.imageAlt, {
  path: ["imageAlt"],
  message: "Describe the image for people who can't see it",
});

export const emailArticleCardBlock = defineEmailBlock({
  type: "article_card",
  label: "Article card",
  description: "A teaser for a blog post, news item or page: optional picture, title, short summary and a link.",
  schema: articleSchema,
  defaults: { title: "", description: "", imageUrl: "", imageAlt: "", linkLabel: "Read more", href: "" } as z.infer<typeof articleSchema>,
  adminFields: [
    { key: "title", label: "Title", type: "text" },
    { key: "description", label: "Summary", type: "textarea", optional: true },
    { key: "imageUrl", label: "Image", type: "image", optional: true },
    { key: "imageAlt", label: "Image alt text", type: "text", optional: true },
    { key: "linkLabel", label: "Link label", type: "text" },
    { key: "href", label: "Link", type: "text" },
  ],
  Render: ({ data, ctx }) => {
    const href = ctx.resolveUrl(data.href);
    return (
      <Row padding="0 32px 24px">
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} style={{ borderCollapse: "collapse", border: `1px solid ${EMAIL.rule}` }}>
          <tbody>
            {data.imageUrl && (
              <tr>
                <td>
                  <a href={href}>
                    <img
                      src={ctx.resolveImage(data.imageUrl)}
                      alt={data.imageAlt}
                      width={EMAIL.width - 66}
                      style={{ display: "block", width: "100%", maxWidth: "100%", height: "auto", border: 0 }}
                    />
                  </a>
                </td>
              </tr>
            )}
            <tr>
              <td style={{ padding: 20 }}>
                <h2 style={{ ...title, fontSize: 19, lineHeight: "26px" }}>{data.title}</h2>
                {data.description && (
                  <p style={{ margin: "8px 0 0", fontSize: 15, lineHeight: "24px", color: EMAIL.ink, fontFamily: EMAIL.font }}>{data.description}</p>
                )}
                <p style={{ margin: "12px 0 0", fontFamily: EMAIL.font, fontSize: 15 }}>
                  <a href={href} style={{ color: EMAIL.navy, fontWeight: 700, textDecoration: "underline" }}>
                    {data.linkLabel} →
                  </a>
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </Row>
    );
  },
});
