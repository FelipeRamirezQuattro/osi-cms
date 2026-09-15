import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { quoteTestimonialBlock } from "@/components/blocks/quote-testimonial";

const base = {
  background: "navy" as const,
  spacingTop: "md" as const,
  spacingBottom: "md" as const,
  quote: "Odessa Separator's equipment has never let us down.",
  attributionName: "Jane Doe",
  roleCompany: "Field Operations Manager, Example Energy",
  sourceHref: null,
};

describe("quote_testimonial block schema", () => {
  it("accepts a valid minimal instance", () => {
    expect(quoteTestimonialBlock.schema.safeParse(base).success).toBe(true);
  });

  it("requires a non-empty quote", () => {
    expect(quoteTestimonialBlock.schema.safeParse({ ...base, quote: "" }).success).toBe(false);
  });

  it("requires a non-empty attribution name", () => {
    expect(quoteTestimonialBlock.schema.safeParse({ ...base, attributionName: "" }).success).toBe(false);
  });

  it("allows roleCompany, portraitUrl, and sourceHref to be omitted", () => {
    const result = quoteTestimonialBlock.schema.safeParse({
      background: "navy",
      spacingTop: "md",
      spacingBottom: "md",
      quote: "Great equipment.",
      attributionName: "Jane Doe",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an unsafe source link", () => {
    expect(
      quoteTestimonialBlock.schema.safeParse({ ...base, sourceHref: "javascript:alert(1)" }).success,
    ).toBe(false);
  });
});

describe("quote_testimonial block render", () => {
  it("renders the quote and attribution", () => {
    const parsed = quoteTestimonialBlock.schema.parse(base);
    const html = renderToStaticMarkup(quoteTestimonialBlock.Render({ data: parsed }) as React.ReactElement);
    const container = document.createElement("div");
    container.innerHTML = html;
    expect(container.querySelector("blockquote")?.textContent).toContain(
      "Odessa Separator's equipment has never let us down.",
    );
    expect(container.textContent).toContain("Jane Doe");
    expect(container.textContent).toContain("Field Operations Manager, Example Energy");
  });

  it("renders a source link when set", () => {
    const parsed = quoteTestimonialBlock.schema.parse({ ...base, sourceHref: "/news/example" });
    const html = renderToStaticMarkup(quoteTestimonialBlock.Render({ data: parsed }) as React.ReactElement);
    const container = document.createElement("div");
    container.innerHTML = html;
    expect(container.querySelector("a[href='/news/example']")).not.toBeNull();
  });

  it("renders no link when sourceHref is unset", () => {
    const parsed = quoteTestimonialBlock.schema.parse(base);
    const html = renderToStaticMarkup(quoteTestimonialBlock.Render({ data: parsed }) as React.ReactElement);
    const container = document.createElement("div");
    container.innerHTML = html;
    expect(container.querySelector("a")).toBeNull();
  });
});
