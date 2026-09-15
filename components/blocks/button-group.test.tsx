import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { buttonGroupBlock } from "@/components/blocks/button-group";

const base = { background: "cream" as const, spacingTop: "sm" as const, spacingBottom: "sm" as const, alignment: "center" as const };

describe("button_group block schema", () => {
  it("accepts 1 button", () => {
    expect(
      buttonGroupBlock.schema.safeParse({ ...base, buttons: [{ label: "Contact us", href: "/contact" }] }).success,
    ).toBe(true);
  });

  it("accepts 3 buttons", () => {
    const result = buttonGroupBlock.schema.safeParse({
      ...base,
      buttons: [
        { label: "One", href: "/one" },
        { label: "Two", href: "/two" },
        { label: "Three", href: "/three" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects 0 buttons", () => {
    expect(buttonGroupBlock.schema.safeParse({ ...base, buttons: [] }).success).toBe(false);
  });

  it("rejects more than 3 buttons", () => {
    const result = buttonGroupBlock.schema.safeParse({
      ...base,
      buttons: [
        { label: "One", href: "/one" },
        { label: "Two", href: "/two" },
        { label: "Three", href: "/three" },
        { label: "Four", href: "/four" },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unsafe href", () => {
    const result = buttonGroupBlock.schema.safeParse({
      ...base,
      buttons: [{ label: "Go", href: "javascript:alert(1)" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty label", () => {
    const result = buttonGroupBlock.schema.safeParse({ ...base, buttons: [{ label: "", href: "/contact" }] });
    expect(result.success).toBe(false);
  });
});

describe("button_group block render", () => {
  it("renders every button as a real link with its own href", () => {
    const parsed = buttonGroupBlock.schema.parse({
      ...base,
      buttons: [
        { label: "Contact us", href: "/contact" },
        { label: "See products", href: "/products" },
      ],
    });
    const html = renderToStaticMarkup(buttonGroupBlock.Render({ data: parsed }) as React.ReactElement);
    const container = document.createElement("div");
    container.innerHTML = html;
    const hrefs = [...container.querySelectorAll("a")].map((a) => a.getAttribute("href"));
    expect(hrefs).toEqual(["/contact", "/products"]);
  });
});
