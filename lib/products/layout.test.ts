import { describe, expect, it } from "vitest";
import {
  LINKED_SECTION_TYPES,
  defaultLinkedRows,
  ensureLinkedRows,
  hasLinkedRows,
  missingLinkedSections,
  resolveLayout,
} from "@/lib/products/layout";

const extra = { type: "rich_text", is_visible: true, data: {} };

describe("product layout", () => {
  it("a product without linked rows resolves to the original template, then its extras", () => {
    const resolved = resolveLayout([extra]);
    expect(resolved.map((r) => r.type)).toEqual([...LINKED_SECTION_TYPES, "rich_text"]);
  });

  it("the default order is today's template order", () => {
    expect(LINKED_SECTION_TYPES).toEqual([
      "product_benefits",
      "product_stages",
      "product_video",
      "product_downloads",
      "product_body",
      "product_specs",
    ]);
  });

  it("a saved layout is used as is", () => {
    const rows = [extra, ...defaultLinkedRows().reverse()];
    expect(resolveLayout(rows).map((r) => r.type)).toEqual(rows.map((r) => r.type));
  });

  it("the editor appends any linked section a partial layout is missing", () => {
    const partial = defaultLinkedRows().slice(0, 2);
    const ensured = ensureLinkedRows(partial);
    expect(new Set(ensured.map((r) => r.type)).size).toBe(LINKED_SECTION_TYPES.length);
    expect(ensured.slice(0, 2)).toEqual(partial);
  });

  it("flags a layout that dropped or duplicated a linked section, but not a plain extras list", () => {
    expect(missingLinkedSections([extra])).toEqual([]);
    expect(hasLinkedRows([extra])).toBe(false);
    const rows = defaultLinkedRows().filter((r) => r.type !== "product_specs");
    expect(missingLinkedSections(rows)).toEqual(["product_specs"]);
    expect(missingLinkedSections([...defaultLinkedRows(), defaultLinkedRows()[0]])).toEqual(["product_benefits"]);
  });
});
