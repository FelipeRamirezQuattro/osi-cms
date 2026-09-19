import { describe, expect, it } from "vitest";
import { renderNewsletterEmail, UNSUBSCRIBE_PLACEHOLDER } from "@/lib/email-blocks/render";

const richText = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Sub heading" }] },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Read " },
        { type: "text", text: "this", marks: [{ type: "bold" }, { type: "link", attrs: { href: "/news/launch" } }] },
      ],
    },
    { type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "One" }] }] }] },
  ],
};

async function render(overrides: Partial<Parameters<typeof renderNewsletterEmail>[0]> = {}) {
  return renderNewsletterEmail({
    subject: "September update",
    preheader: "What's new this month",
    mailingAddress: "1 Test Street, Odessa, TX",
    blocks: [
      { type: "heading", data: { text: "Big news", size: "large", align: "left" } },
      { type: "text", data: { content: richText } },
      { type: "image", data: { src: "https://cdn.test/a.jpg", alt: "A separator", href: null } },
      { type: "button", data: { label: "See it", href: "/products", align: "left" } },
      { type: "divider", data: {} },
      { type: "article_card", data: { title: "A post", description: "Summary", imageUrl: "", imageAlt: "", linkLabel: "Read more", href: "/blog/a-post" } },
    ],
    ...overrides,
  });
}

describe("renderNewsletterEmail", () => {
  it("renders every block into email HTML with a plain-text alternative", async () => {
    const { html, text } = await render();
    for (const expected of ["Big news", "Sub heading", "A separator", "See it", "A post", "Summary"]) expect(html).toContain(expected);
    // html-to-text upper-cases <h1> headings, hence the case-insensitive check.
    expect(text.toLowerCase()).toContain("big news");
    expect(text).toContain("One");
  });

  it("makes every link absolute so email clients can open them", async () => {
    const { html } = await render();
    expect(html).toContain('href="http://localhost:3000/products"');
    expect(html).toContain('href="http://localhost:3000/news/launch"');
    expect(html).toContain('href="http://localhost:3000/blog/a-post"');
    expect(html).not.toMatch(/href="\/[^/]/);
  });

  it("always carries the unsubscribe placeholder and the mailing address in the fixed footer", async () => {
    const { html, text } = await render({ blocks: [] });
    expect(html).toContain(`href="${UNSUBSCRIBE_PLACEHOLDER}"`);
    expect(html).toContain("1 Test Street, Odessa, TX");
    expect(text).toContain(UNSUBSCRIBE_PLACEHOLDER);
  });

  it("shows a visible placeholder when no mailing address is configured", async () => {
    const { html } = await render({ mailingAddress: null });
    expect(html).toContain("[Mailing address not set]");
  });

  it("puts the preheader in the message and skips it when empty", async () => {
    expect(await render().then((r) => r.html)).toContain("What&#x27;s new this month");
    expect(await render({ preheader: "" }).then((r) => r.html)).not.toContain("display:none");
  });

  it("escapes editor-supplied text instead of injecting markup", async () => {
    const { html } = await render({
      blocks: [{ type: "heading", data: { text: "<script>alert(1)</script>", size: "large", align: "left" } }],
    });
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("skips a block whose type is no longer registered rather than failing the whole email", async () => {
    const { html } = await render({ blocks: [{ type: "gone", data: {} }, { type: "heading", data: { text: "Still here", size: "large", align: "left" } }] });
    expect(html).toContain("Still here");
  });
});
