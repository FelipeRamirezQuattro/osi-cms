import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { peopleCardsBlock, telHref } from "@/components/blocks/people-cards";

const Render = peopleCardsBlock.Render as (props: { data: unknown }) => React.ReactElement | null;
const base = { background: "cream", spacingTop: "md", spacingBottom: "md" };
const render = (data: Record<string, unknown>) => renderToStaticMarkup(<Render data={peopleCardsBlock.schema.parse({ ...base, ...data })} />);

describe("people_cards", () => {
  it("renders name, title, tel: and mailto: links", () => {
    const html = render({
      title: "US Sales",
      cards: [{ name: "Shivani Vyas", title: "Sales Manager", phones: [{ label: "Cell", number: "+1-432-208-7977" }], emails: ["svyas@odsep.com"] }],
    });
    expect(html).toContain(">US Sales</h2>");
    expect(html).toContain('href="tel:+14322087977"');
    expect(html).toContain('href="mailto:svyas@odsep.com"');
    expect(html).toContain("Sales Manager");
  });

  it("lays out 1 column on phones and 3–4 on desktop", () => {
    const html = render({ cards: [{ name: "A" }] });
    expect(html).toContain("grid-cols-1");
    expect(html).toContain("lg:grid-cols-3");
    expect(html).toContain("xl:grid-cols-4");
  });

  it("shows the address only when the card has one", () => {
    expect(render({ cards: [{ name: "A" }] })).not.toContain("Pearl");
    expect(render({ cards: [{ name: "A", address: "7108-56 Ave NW, Edmonton AB" }] })).toContain("Edmonton");
  });

  it("requires alt text for a logo", () => {
    expect(peopleCardsBlock.schema.safeParse({ ...base, cards: [{ name: "A", logoUrl: "https://x/y.png" }] }).success).toBe(false);
    expect(peopleCardsBlock.schema.safeParse({ ...base, cards: [{ name: "A", logoUrl: "https://x/y.png", logoAlt: "Impel Energy" }] }).success).toBe(true);
  });

  it("normalises phone numbers for tel:", () => {
    expect(telHref("+1 (432)-444-1234")).toBe("tel:+14324441234");
  });
});
