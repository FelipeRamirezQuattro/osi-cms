import { describe, expect, it } from "vitest";
import { buildSnippet, highlightParts, searchTerms, SNIPPET_LENGTH } from "@/lib/search-snippet";

const LONG = `${"Intro words that come first. ".repeat(12)}OSI has achieved ISO 45001 Certification, reaffirming our commitment to a safe workplace. ${"Closing words that follow. ".repeat(12)}`;

describe("buildSnippet", () => {
  it("is about 160 characters, never the whole body, and contains the match", () => {
    const s = buildSnippet(LONG, "ISO")!;
    expect(s).toContain("ISO 45001");
    expect(s.replace(/…/g, "").length).toBeLessThanOrEqual(SNIPPET_LENGTH);
    expect(s.startsWith("…") && s.endsWith("…")).toBe(true);
    expect(s.length).toBeLessThan(LONG.length / 3);
  });

  it("matches stems the way the database does (careers → career)", () => {
    expect(buildSnippet("Build a career with OSI in Odessa.", "careers")).toContain("career");
  });

  it("prefers the whole phrase over an earlier single word", () => {
    const text = "We do not shop here. The machine shop in Odessa makes parts.";
    expect(buildSnippet(text, "machine shop")).toContain("machine shop");
  });

  it("returns the text unchanged, without ellipses, when it is short", () => {
    expect(buildSnippet("Gas separation tools.", "gas")).toBe("Gas separation tools.");
  });

  it("is null when nothing matches, the text is empty or the query has no words", () => {
    expect(buildSnippet("Gas separation tools.", "zzz")).toBeNull();
    expect(buildSnippet(null, "gas")).toBeNull();
    expect(buildSnippet("text", "%")).toBeNull();
  });

  it("survives regex characters and very long queries", () => {
    expect(buildSnippet("a (bb) c.* d", "(bb) .*")).toContain("bb");
    expect(() => buildSnippet(LONG, "x".repeat(500))).not.toThrow();
    expect(buildSnippet("O'Brien works here", "O'Brien")).toContain("O'Brien");
  });

  it("does not cut a word in half at either end", () => {
    const s = buildSnippet(`${"abcdefghij ".repeat(30)}target ${"klmnopqrst ".repeat(30)}`, "target")!;
    for (const word of s.replace(/…/g, "").split(" ")) expect(["abcdefghij", "target", "klmnopqrst", ""]).toContain(word);
  });
});

describe("highlightParts", () => {
  it("marks hits and keeps all of the text", () => {
    const parts = highlightParts("The ISO 45001 certificate", "iso");
    expect(parts.filter((p) => p.hit).map((p) => p.text)).toEqual(["ISO"]);
    expect(parts.map((p) => p.text).join("")).toBe("The ISO 45001 certificate");
  });

  it("returns the text as one plain part for an empty query and never treats text as markup", () => {
    expect(highlightParts("<b>x</b>", "")).toEqual([{ text: "<b>x</b>", hit: false }]);
    expect(highlightParts("<b>x</b> shop", "shop").map((p) => p.text).join("")).toBe("<b>x</b> shop");
  });

  it("searchTerms drops punctuation, single characters and duplicates", () => {
    expect(searchTerms("a & Shop | shop %")).toEqual(["shop"]);
  });
});
