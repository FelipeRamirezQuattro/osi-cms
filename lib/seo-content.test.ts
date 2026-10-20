import { describe, expect, it } from "vitest";
import {
  SITE_DEFAULT_DESCRIPTION,
  cleanSeoTitle,
  deriveDescriptionFromBlocks,
  resolveDescription,
  richTextParagraphs,
  truncateDescription,
} from "@/lib/seo-content";

const doc = (...paragraphs: string[]) => ({
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "VISION" }] },
    ...paragraphs.map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })),
  ],
});

describe("truncateDescription", () => {
  it("leaves short text alone and collapses whitespace", () => {
    expect(truncateDescription("  a   b\n c ")).toBe("a b c");
  });
  it("cuts at a word boundary within 160 characters and adds an ellipsis", () => {
    const out = truncateDescription("word ".repeat(80));
    expect(out.length).toBeLessThanOrEqual(160);
    expect(out.endsWith("…")).toBe(true);
    expect(out).not.toMatch(/\bwor…$/);
  });
});

describe("richTextParagraphs", () => {
  it("returns paragraphs only, skipping headings, and tolerates junk", () => {
    expect(richTextParagraphs(doc("One.", "Two."))).toEqual(["One.", "Two."]);
    expect(richTextParagraphs(null)).toEqual([]);
    expect(richTextParagraphs({ type: "doc" })).toEqual([]);
  });
});

describe("deriveDescriptionFromBlocks", () => {
  const prose = "OSI's vision is to become one of the market leaders in innovative downhole solutions.";

  it("uses the first rich text paragraphs", () => {
    expect(deriveDescriptionFromBlocks([{ type: "hero_page", data: { title: "About" } }, { type: "rich_text", data: { content: doc(prose) } }])).toBe(prose);
  });
  it("prefers a plain-text subtitle on an earlier block", () => {
    const subtitle = "Gas separators and sand control for artificial-lift wells.";
    expect(deriveDescriptionFromBlocks([{ type: "hero", data: { subheading: subtitle } }, { type: "rich_text", data: { content: doc(prose) } }])).toBe(subtitle);
  });
  it("ignores fragments too short to be a description, and returns null when nothing usable", () => {
    expect(deriveDescriptionFromBlocks([{ type: "rich_text", data: { content: doc("Short.") } }])).toBeNull();
    expect(deriveDescriptionFromBlocks([{ type: "link_columns", data: { columns: [] } }])).toBeNull();
  });
});

describe("resolveDescription", () => {
  it("reports where the description came from", () => {
    expect(resolveDescription("Explicit", () => "derived")).toEqual({ description: "Explicit", source: "seo_description" });
    expect(resolveDescription(null, () => "Derived text")).toEqual({ description: "Derived text", source: "content" });
    expect(resolveDescription("  ", () => null)).toEqual({ description: SITE_DEFAULT_DESCRIPTION, source: "default" });
  });
});

describe("cleanSeoTitle", () => {
  it("strips the legacy Wix site-slug suffix", () => {
    expect(cleanSeoTitle("Hiring | odessaseparator")).toBe("Hiring");
    expect(cleanSeoTitle("Machine Shop – OdessaSeparator.com")).toBe("Machine Shop");
  });
  it("leaves real titles alone, and never returns an empty string", () => {
    expect(cleanSeoTitle("ESP Chem Screen")).toBe("ESP Chem Screen");
    expect(cleanSeoTitle("| odessaseparator")).toBe("| odessaseparator");
  });
});

describe("truncateDescription noise", () => {
  it("drops bullets and zero-width characters from pasted copy", () => {
    expect(truncateDescription("•\u2060 \u2060Develop sales strategies.")).toBe("Develop sales strategies.");
  });
});
