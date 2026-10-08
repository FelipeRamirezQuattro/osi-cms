import { describe, expect, it } from "vitest";
import type { LegacyEntry } from "./batch2-manifest";
import { productSlug } from "./batch2-manifest";
import {
  findChromeImages,
  mapBlogPost,
  mapPage,
  mapProduct,
  matchExistingProduct,
  normalizeProductName,
  textSimilarity,
  toRichTextDoc,
  type ScrapedPage,
} from "./map";

const page = (items: ScrapedPage["items"], extra: Partial<ScrapedPage> = {}): ScrapedPage => ({
  id: "PUB-000",
  url: "https://www.odessaseparator.com/x",
  title: "Super Perf | odessaseparator",
  meta_description: null,
  items,
  pdfs: [],
  videos: [],
  ...extra,
});
const ctx = { chromeImages: new Set<string>() };
const product: LegacyEntry = { id: "PUB-062", path: "/super-perf", title: "Super Perf", group: "sand-control", target: "product", slug: "super-perf" };
const img = (id: string) => `https://static.wixstatic.com/media/${id}~mv2.png/v1/fill/w_900,h_900/x.png`;

describe("productSlug", () => {
  it("drops a trailing -osi only", () => {
    expect(productSlug("/esp-chem-screen-osi")).toBe("esp-chem-screen");
    expect(productSlug("/osi-mesh")).toBe("osi-mesh");
  });
});

describe("toRichTextDoc", () => {
  it("clamps headings to h2/h3 and flattens tables with a flag", () => {
    const r = toRichTextDoc([
      { type: "heading", level: 1, text: "A" },
      { type: "heading", level: 4, text: "B" },
      { type: "table", rows: [["Size", "2 in"]] },
    ])!;
    expect(JSON.stringify(r.doc)).toContain('"level":2');
    expect(JSON.stringify(r.doc)).toContain('"level":3');
    expect(r.flags).toEqual(["table_flattened_to_list"]);
  });
  it("returns null for no text content", () => {
    expect(toRichTextDoc([{ type: "image", src: "x", alt: "" }])).toBeNull();
  });
});

describe("mapProduct", () => {
  it("builds summary, benefits, specs and flags without inventing", () => {
    const m = mapProduct(
      product,
      page(
        [
          { type: "heading", level: 1, text: "SUPER PERF" },
          { type: "image", src: img("a"), alt: "a.png" },
          { type: "paragraph", text: "A filtration system." },
          { type: "list", ordered: false, items: ["Fewer failures"] },
          { type: "heading", level: 2, text: "BENEFITS" },
          { type: "table", rows: [["Length", "30 ft"], ["", ""], ["a", "b", "c"]] },
        ],
        { videos: [{ url: "https://youtube.com/embed/x", provider: "youtube" }], pdfs: [{ url: "https://www.odessaseparator.com/_files/ugd/x.pdf", text: "Super Perf" }] },
      ),
      ctx,
    );
    expect(m.summary).toBe("A filtration system.");
    expect(m.benefits).toEqual([{ title: "Fewer failures" }]);
    expect(m.specs).toEqual([{ label: "Length", value: "30 ft" }]);
    expect(m.categorySlug).toBe("sand-control");
    expect(m.videoUrl).toBe("https://youtube.com/embed/x");
    expect(m.brochurePdfUrl).toContain("x.pdf");
    expect(m.imageAlts[0].alt).toBe("SUPER PERF");
    expect(m.flags).toContain("alt_needs_review");
    expect(m.flags).toContain("spec_row_not_2_columns");
  });
  it("leaves ESP/SRP uncategorized and flags it", () => {
    const m = mapProduct({ ...product, group: "esp" }, page([{ type: "paragraph", text: "x" }]), ctx);
    expect(m.categorySlug).toBeNull();
    expect(m.flags).toContain("category_needs_review");
    expect(m.flags).toContain("no_benefits");
  });
});

describe("mapPage", () => {
  const entry: LegacyEntry = { id: "PUB-079", path: "/osi-at-alf", title: "OSI at ALF", group: "events", target: "page", slug: "osi-at-alf" };
  it("starts with hero_page, drops chrome images, uses nearest heading for alt", () => {
    const chrome = img("seal");
    const m = mapPage(
      entry,
      page([
        { type: "heading", level: 1, text: "OSI AT ALF" },
        { type: "heading", level: 2, text: "Booth 42" },
        { type: "image", src: img("pic"), alt: "" },
        { type: "image", src: chrome, alt: "seal" },
        { type: "paragraph", text: "Join us." },
      ]),
      { chromeImages: new Set(["seal~mv2.png"]) },
    );
    expect(m.blocks[0]).toEqual({ type: "hero_page", data: { background: "navy", title: "OSI at ALF" } });
    const image = m.blocks.find((b) => b.type === "image")!;
    expect(image.data.alt).toBe("Booth 42");
    expect(JSON.stringify(m.blocks)).not.toContain("seal");
    expect(m.flags).toContain("alt_needs_review");
  });
  it("lists form field labels without building a form", () => {
    const m = mapPage(entry, page([{ type: "paragraph", text: "Email*" }, { type: "paragraph", text: "Company" }]), ctx);
    expect(m.formFields).toEqual(["Email", "Company"]);
  });
});

describe("mapBlogPost", () => {
  it("finds a publish date and flags when absent", () => {
    const e: LegacyEntry = { id: "PUB-022", path: "/single-post/x", title: "T", group: "news", target: "blog", slug: "x" };
    const dated = mapBlogPost(e, page([{ type: "paragraph", text: "Aug 5, 2025" }, { type: "paragraph", text: "Body." }]), ctx);
    expect(dated.publishedAt).toBe(new Date("Aug 5 2025").toISOString());
    expect(mapBlogPost(e, page([{ type: "paragraph", text: "Body." }]), ctx).flags).toContain("no_publish_date_found");
  });
});

describe("duplicates and matching", () => {
  it("scores near-identical text high and different text low", () => {
    expect(textSimilarity("gas vent tool for wells", "gas vent tool for wells")).toBe(1);
    expect(textSimilarity("gas vent tool", "sand screen mesh")).toBeLessThan(0.2);
  });
  it("normalizes OSI/ESP prefixes and punctuation", () => {
    expect(normalizeProductName("OSI ESP Guardian-Shield")).toBe("guardian shield");
  });
  it("matches existing products by name or slug", () => {
    const existing = [{ slug: "esp-chem-screen", name: "ESP Chem Screen" }];
    expect(matchExistingProduct("ESP Chem Screen OSI", "esp-chem-screen", existing).confidence).toBe("exact");
    expect(matchExistingProduct("Chem Screen", "chem-screen", existing).confidence).toBe("high");
    expect(matchExistingProduct("Super Perf", "super-perf", existing).confidence).toBe("none");
  });
  it("finds images repeated across many pages as chrome", () => {
    const pages = [1, 2, 3, 4].map((n) => page([{ type: "image", src: img("seal"), alt: "" }, { type: "image", src: img(`u${n}`), alt: "" }]));
    const chrome = findChromeImages(pages);
    expect(chrome.has("seal~mv2.png")).toBe(true);
    expect(chrome.has("u1~mv2.png")).toBe(false);
  });
});
