import { describe, expect, it } from "vitest";
import { cleanItems, cleanPage, groupBullets, isTinyImage, stripAgentWidget, dedupeItems, imageIdentity, isChromeText, mergeSplitHeadings, stripZeroWidth } from "./clean";

describe("legacy clean", () => {
  it("strips zero-width characters", () => {
    expect(stripZeroWidth("a​b﻿c")).toBe("abc");
  });

  it("detects nav chrome, cookie and agent-widget text", () => {
    expect(isChromeText("About Us")).toBe(true);
    expect(isChromeText("We use cookies to improve your experience")).toBe(true);
    expect(isChromeText("Contact the representative")).toBe(true);
    expect(isChromeText("The fluid rises internally")).toBe(false);
  });

  it("merges consecutive same-level split headings only", () => {
    const out = mergeSplitHeadings([
      { type: "heading", level: 2, text: "USEFUL" },
      { type: "heading", level: 2, text: "FOR YOUR" },
      { type: "paragraph", text: "x" },
      { type: "heading", level: 2, text: "NEXT" },
    ]);
    expect(out).toEqual([
      { type: "heading", level: 2, text: "USEFUL FOR YOUR" },
      { type: "paragraph", text: "x" },
      { type: "heading", level: 2, text: "NEXT" },
    ]);
  });

  it("dedupes repeated blocks and images that differ only by transform suffix", () => {
    const a = "https://static.wixstatic.com/media/1ac9e9_abc~mv2.jpg/v1/fill/w_100,h_100/x.jpg";
    const b = "https://static.wixstatic.com/media/1ac9e9_abc~mv2.jpg/v1/fill/w_900,h_900/x.jpg";
    expect(imageIdentity(a)).toBe(imageIdentity(b));
    const out = dedupeItems([
      { type: "paragraph", text: "Same" },
      { type: "paragraph", text: "same " },
      { type: "image", src: a, alt: "" },
      { type: "image", src: b, alt: "" },
    ]);
    expect(out).toHaveLength(2);
  });

  it("cleanItems drops chrome and empty tables, keeps content order", () => {
    const out = cleanItems([
      { type: "paragraph", text: "Careers" },
      { type: "heading", level: 1, text: " SUPER​ PERF " },
      { type: "table", rows: [["", ""]] },
      { type: "list", ordered: false, items: ["One", "Contact the agent"] },
    ]);
    expect(out).toEqual([
      { type: "heading", level: 1, text: "SUPER PERF" },
      { type: "list", ordered: false, items: ["One"] },
    ]);
  });

  it("strips the agent widget group and reports the dropped person text", () => {
    const out = stripAgentWidget([
      { type: "paragraph", text: "Keep" },
      { type: "image", src: "https://x/y.jpg", alt: "" },
      { type: "paragraph", text: "Contact Him" },
      { type: "paragraph", text: "Neil Johnson" },
      { type: "paragraph", text: "Expert Engineer" },
      { type: "paragraph", text: "Also keep" },
    ]);
    expect(out.items.map((i) => (i.type === "paragraph" ? i.text : i.type))).toEqual(["Keep", "Also keep"]);
    expect(out.dropped).toEqual(["Neil Johnson", "Expert Engineer"]);
  });

  it("groups wrapped bullets into list items", () => {
    const out = groupBullets([
      { type: "paragraph", text: "- Downhole failures are" },
      { type: "paragraph", text: "greatly reduced." },
      { type: "paragraph", text: "- Compatible with any lift." },
      { type: "paragraph", text: "Next paragraph." },
    ]);
    expect(out).toEqual([
      { type: "list", ordered: false, items: ["Downhole failures are greatly reduced.", "Compatible with any lift."] },
      { type: "paragraph", text: "Next paragraph." },
    ]);
  });

  it("flags tiny decorative images and cleanPage composes the steps", () => {
    expect(isTinyImage("https://s/media/a~mv2.png/v1/fill/w_65,h_65/a.png")).toBe(true);
    expect(isTinyImage("https://s/media/a~mv2.png/v1/fill/w_991,h_851/a.png")).toBe(false);
    const { items } = cleanPage([
      { type: "image", src: "https://s/media/a~mv2.png/v1/fill/w_65,h_65/a.png", alt: "" },
      { type: "paragraph", text: "Body" },
    ]);
    expect(items).toEqual([{ type: "paragraph", text: "Body" }]);
  });
});
