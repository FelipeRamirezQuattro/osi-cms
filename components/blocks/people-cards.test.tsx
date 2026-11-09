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

  describe("photo", () => {
    const photo = "https://x.example/media/lbell.jpg";

    it("is optional: a card with no photo renders no image, placeholder or initials", () => {
      const html = render({ cards: [{ name: "Luke Bell", title: "Sales/Application Engineer" }] });
      expect(html).not.toContain("<img");
      expect(html).not.toContain("data-people-photo");
      expect(html).not.toContain("svg");
      expect(html).toContain("Luke Bell");
    });

    it("shows a fixed-ratio, cover-cropped portrait at the top of the card", () => {
      const html = render({ cards: [{ name: "Luke Bell", photoUrl: photo }] });
      expect(html).toContain("data-people-photo");
      expect(html).toContain("aspect-square");
      expect(html).toContain("object-cover");
      // The portrait comes before the name.
      expect(html.indexOf("data-people-photo")).toBeLessThan(html.indexOf("Luke Bell</p>"));
    });

    it("defaults the alt text to the person's name and uses a custom one when given", () => {
      expect(render({ cards: [{ name: "Luke Bell", photoUrl: photo }] })).toContain('alt="Luke Bell"');
      expect(render({ cards: [{ name: "Luke Bell", photoUrl: photo, photoAlt: "Luke Bell at the Odessa yard" }] })).toContain(
        'alt="Luke Bell at the Odessa yard"',
      );
      expect(render({ cards: [{ name: "Luke Bell", photoUrl: photo, photoAlt: "   " }] })).toContain('alt="Luke Bell"');
    });

    it("schema accepts a photo without alt text and keeps the distributor logo rule", () => {
      expect(peopleCardsBlock.schema.safeParse({ ...base, cards: [{ name: "A", photoUrl: photo }] }).success).toBe(true);
      expect(peopleCardsBlock.schema.safeParse({ ...base, cards: [{ name: "A", photoUrl: photo, logoUrl: "https://x/y.png" }] }).success).toBe(false);
    });

    it("a distributor card keeps its logo and shows no portrait", () => {
      const html = render({ cards: [{ name: "A", company: "Impel Energy", logoUrl: "https://x.example/impel.png", logoAlt: "Impel Energy" }] });
      expect(html).toContain('alt="Impel Energy"');
      expect(html).not.toContain("data-people-photo");
    });

    it("exposes the photo in the admin form", () => {
      const cards = peopleCardsBlock.adminFields.find((f) => f.key === "cards") as { itemFields: { key: string; type: string }[] };
      expect(cards.itemFields).toContainEqual(expect.objectContaining({ key: "photoUrl", type: "image" }));
      expect(cards.itemFields.map((f) => f.key)).toContain("photoAlt");
    });
  });
});
