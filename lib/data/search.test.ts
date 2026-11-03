import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * searchSite with a fake query builder: checks the snippet is built from the body text, that every status-bearing table is
 * filtered to published rows, and that a missing 0061 column/view falls back to the title/summary queries.
 */
type Call = { table: string; select: string; filters: [string, unknown][] };
const { calls, state } = vi.hoisted(() => ({
  calls: [] as { table: string; select: string; filters: [string, unknown][] }[],
  state: { bodyColumnsMissing: false, rows: {} as Record<string, unknown[]> },
}));

function builder(table: string) {
  const call: Call = { table, select: "", filters: [] };
  const b: Record<string, unknown> = {
    select(cols: string) {
      call.select = cols;
      calls.push(call);
      return b;
    },
    eq(col: string, val: unknown) {
      call.filters.push([`eq:${col}`, val]);
      return b;
    },
    textSearch(col: string, q: string) {
      call.filters.push([`fts:${col}`, q]);
      return b;
    },
    ilike(col: string, q: string) {
      call.filters.push([`ilike:${col}`, q]);
      return b;
    },
    limit() {
      return b;
    },
    then(resolve: (v: unknown) => unknown) {
      const needsBody = /search_body|body_text/.test(call.select) || table === "product_search_documents";
      const out = state.bodyColumnsMissing && needsBody ? { data: null, error: { code: "42703" } } : { data: state.rows[table] ?? [], error: null };
      return Promise.resolve(out).then(resolve);
    },
  };
  return b;
}

vi.mock("@/lib/db/client", () => ({ createServerDbClient: () => ({ from: builder }) }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }), headers: async () => new Headers({ "user-agent": "Googlebot" }) }));
vi.mock("@/lib/actions/form-submission-pipeline", () => ({ hashClientIp: async () => "h" }));
vi.mock("@/lib/data/analytics-events", () => ({ recordSearchQuery: vi.fn() }));

import { searchSite } from "@/lib/data/search";

const BODY = `${"Filler sentence about nothing. ".repeat(10)}OSI has achieved ISO 45001 Certification for safety. ${"More filler. ".repeat(20)}`;

beforeEach(() => {
  calls.length = 0;
  state.bodyColumnsMissing = false;
  state.rows = {
    page_publications: [{ slug: "hse", snapshot: { meta: { title: "HSE", seo_description: "Health and safety" } }, search_body: BODY }],
    product_search_documents: [{ slug: "gas-release-system", name: "Gas Release System", tagline: null, summary: "Summary", category_slug: "gas-separation", body_text: "Improves gas separation with ISO tested parts." }],
    news_posts: [{ slug: "n", title: "News", excerpt: "Ex", kind: "news", search_body: null }],
  };
});

describe("searchSite body text", () => {
  it("returns a short snippet around the match for pages and products", async () => {
    const results = await searchSite("ISO");
    const page = results.find((r) => r.type === "page")!;
    expect(page.snippet).toContain("ISO 45001");
    expect(page.snippet!.length).toBeLessThanOrEqual(165);
    expect(page.excerpt).toBe("Health and safety");
    expect(results.find((r) => r.type === "product")!.snippet).toContain("ISO tested");
    expect(results.find((r) => r.type === "news")!.snippet).toBeNull();
  });

  it("only searches published rows of every status-bearing table", async () => {
    await searchSite("ISO");
    for (const table of ["product_search_documents", "news_posts", "industries", "applications", "resources"]) {
      const call = calls.find((c) => c.table === table);
      expect(call?.filters, table).toContainEqual(["eq:status", "published"]);
    }
    // page_publications only ever holds published snapshots.
    expect(calls.some((c) => c.table === "pages")).toBe(false);
  });

  it("escapes LIKE wildcards and survives quotes and a 500-character query", async () => {
    await searchSite("%");
    expect(calls.find((c) => c.table === "resources")?.filters).toContainEqual(["ilike:title", "%\\%%"]);
    await searchSite("100%_x");
    expect(calls.filter((c) => c.table === "industries").at(-1)?.filters).toContainEqual(["ilike:name", "%100\\%\\_x%"]);
    await expect(searchSite("O'Brien \"x\"")).resolves.toBeDefined();
    await expect(searchSite("iso ".repeat(125))).resolves.toBeDefined();
  });

  it("falls back to the title/summary queries when migration 0061 is not applied", async () => {
    state.bodyColumnsMissing = true;
    state.rows.page_publications = [{ slug: "hse", snapshot: { meta: { title: "HSE", seo_description: "Health" } } }];
    state.rows.products = [{ slug: "p", name: "Pump", tagline: "T", summary: "S", product_categories: { slug: "pumps" } }];
    const results = await searchSite("pump");
    expect(results.map((r) => r.type).sort()).toEqual(["news", "page", "product"]);
    expect(results.every((r) => r.snippet === null)).toBe(true);
    expect(results.find((r) => r.type === "product")!.href).toBe("/products/pumps/p");
  });
});
