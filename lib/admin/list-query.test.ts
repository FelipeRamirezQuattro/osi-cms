import { describe, expect, it } from "vitest";
import { filterBySearch, filterByStatus, paginate, readParam, sortRows } from "@/lib/admin/list-query";

type Row = { id: string; title: string; status: string; updated: string | null };

const rows: Row[] = [
  { id: "1", title: "Banana page", status: "draft", updated: "2026-01-01" },
  { id: "2", title: "apple page", status: "published", updated: "2026-03-01" },
  { id: "3", title: "Cherry page", status: "published", updated: null },
];

describe("readParam", () => {
  it("reads from a URLSearchParams", () => {
    const params = new URLSearchParams("q=hello&status=draft");
    expect(readParam(params, "q")).toBe("hello");
    expect(readParam(params, "missing")).toBe("");
  });

  it("reads from a plain object", () => {
    expect(readParam({ q: "hi" }, "q")).toBe("hi");
    expect(readParam({ q: "hi" }, "status")).toBe("");
  });
});

describe("filterBySearch", () => {
  it("is case-insensitive and matches a substring", () => {
    const result = filterBySearch(rows, "PAGE", (r) => r.title);
    expect(result).toHaveLength(3);
    expect(filterBySearch(rows, "ban", (r) => r.title).map((r) => r.id)).toEqual(["1"]);
  });

  it("returns every row for a blank/whitespace query", () => {
    expect(filterBySearch(rows, "   ", (r) => r.title)).toEqual(rows);
    expect(filterBySearch(rows, "", (r) => r.title)).toEqual(rows);
  });

  it("returns no rows when nothing matches", () => {
    expect(filterBySearch(rows, "zzz-no-match", (r) => r.title)).toEqual([]);
  });
});

describe("filterByStatus", () => {
  it("is a no-op for an empty status", () => {
    expect(filterByStatus(rows, "", (r) => r.status)).toEqual(rows);
  });

  it("filters to an exact status match", () => {
    expect(filterByStatus(rows, "published", (r) => r.status).map((r) => r.id)).toEqual(["2", "3"]);
  });
});

describe("sortRows", () => {
  it("sorts ascending by default", () => {
    expect(sortRows(rows, (r) => r.title).map((r) => r.id)).toEqual(["2", "1", "3"]);
  });

  it("sorts descending when asked", () => {
    expect(sortRows(rows, (r) => r.title, "desc").map((r) => r.id)).toEqual(["3", "1", "2"]);
  });

  it("always pushes nullish values to the end, in both directions", () => {
    expect(sortRows(rows, (r) => r.updated, "asc").map((r) => r.id)).toEqual(["1", "2", "3"]);
    expect(sortRows(rows, (r) => r.updated, "desc").map((r) => r.id)).toEqual(["2", "1", "3"]);
  });

  it("does not mutate the input array", () => {
    const original = [...rows];
    sortRows(rows, (r) => r.title);
    expect(rows).toEqual(original);
  });

  it("compares strings case-insensitively (a lowercase title sorts by letter, not ASCII case)", () => {
    // "apple" (lowercase) must sort between "Banana" and "Cherry" alphabetically,
    // not after both purely because uppercase letters sort before lowercase in ASCII.
    expect(sortRows(rows, (r) => r.title).map((r) => r.id)).toEqual(["2", "1", "3"]);
  });
});

describe("paginate", () => {
  const many = Array.from({ length: 45 }, (_, i) => i + 1);

  it("slices the first page by default page size", () => {
    const result = paginate(many, 1, 20);
    expect(result.rows).toEqual(many.slice(0, 20));
    expect(result.totalPages).toBe(3);
    expect(result.total).toBe(45);
  });

  it("slices a middle page", () => {
    const result = paginate(many, 2, 20);
    expect(result.rows).toEqual(many.slice(20, 40));
  });

  it("clamps a page beyond the end to the last page", () => {
    const result = paginate(many, 999, 20);
    expect(result.page).toBe(3);
    expect(result.rows).toEqual(many.slice(40, 45));
  });

  it("clamps a zero/negative/NaN page to page 1", () => {
    expect(paginate(many, 0, 20).page).toBe(1);
    expect(paginate(many, -5, 20).page).toBe(1);
    expect(paginate(many, Number.NaN, 20).page).toBe(1);
  });

  it("always reports at least 1 total page, even for an empty list", () => {
    const result = paginate([], 1, 20);
    expect(result.totalPages).toBe(1);
    expect(result.rows).toEqual([]);
  });
});
