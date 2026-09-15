import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  countBrokenLinks,
  extractInternalLinkCandidates,
  findBrokenPaths,
  isIgnorableCandidate,
  listBrokenLinks,
} from "@/lib/data/link-audit";

describe("extractInternalLinkCandidates", () => {
  it("finds a site-relative path nested anywhere in a block's data", () => {
    const data = { headline: "Welcome", cta: { href: "/products/artificial-lift/gas-release-system" } };
    expect(extractInternalLinkCandidates(data)).toEqual(["/products/artificial-lift/gas-release-system"]);
  });

  it("finds multiple distinct candidates and dedupes repeats", () => {
    const data = {
      items: [{ href: "/industries/oil-gas" }, { href: "/industries/oil-gas" }, { href: "/applications/artificial-lift" }],
    };
    const result = extractInternalLinkCandidates(data);
    expect(result).toHaveLength(2);
    expect(result).toContain("/industries/oil-gas");
    expect(result).toContain("/applications/artificial-lift");
  });

  it("ignores an absolute external URL", () => {
    expect(extractInternalLinkCandidates({ href: "https://example.com/products/foo" })).toEqual([]);
  });

  it("ignores a protocol-relative URL", () => {
    expect(extractInternalLinkCandidates({ href: "//cdn.example.com/foo" })).toEqual([]);
  });

  it("ignores a file path with an extension (e.g. an uploaded image)", () => {
    expect(extractInternalLinkCandidates({ src: "/uploads/2026/photo.jpg" })).toEqual([]);
  });

  it("ignores an anchor and a mailto link", () => {
    expect(extractInternalLinkCandidates({ href: "#contact" })).toEqual([]);
    expect(extractInternalLinkCandidates({ href: "mailto:info@example.com" })).toEqual([]);
  });

  it("returns an empty array for null/empty data", () => {
    expect(extractInternalLinkCandidates(null)).toEqual([]);
    expect(extractInternalLinkCandidates({})).toEqual([]);
  });
});

describe("isIgnorableCandidate", () => {
  it("treats admin/api/preview/etc. as ignorable", () => {
    expect(isIgnorableCandidate("/admin")).toBe(true);
    expect(isIgnorableCandidate("/admin/pages")).toBe(true);
    expect(isIgnorableCandidate("/api/contact")).toBe(true);
    expect(isIgnorableCandidate("/preview/about-us")).toBe(true);
  });

  it("does not treat a real content path as ignorable", () => {
    expect(isIgnorableCandidate("/products/artificial-lift/gas-release-system")).toBe(false);
    expect(isIgnorableCandidate("/about-us")).toBe(false);
  });

  it("does not false-positive on a path that merely starts with the same letters", () => {
    // "/apisomething" is not "/api" or "/api/..." and must not be excluded by a naive startsWith("/api").
    expect(isIgnorableCandidate("/apisomething")).toBe(false);
  });
});

describe("findBrokenPaths", () => {
  const known = new Set(["/about-us", "/products/artificial-lift/gas-release-system"]);

  it("keeps a candidate that isn't in the known set and isn't ignorable", () => {
    expect(findBrokenPaths(["/about-us", "/no-such-page"], known)).toEqual(["/no-such-page"]);
  });

  it("drops ignorable candidates even if they aren't in the known set", () => {
    expect(findBrokenPaths(["/admin/pages", "/no-such-page"], known)).toEqual(["/no-such-page"]);
  });

  it("returns an empty array when every candidate resolves", () => {
    expect(findBrokenPaths(["/about-us", "/products/artificial-lift/gas-release-system"], known)).toEqual([]);
  });
});

// --- listBrokenLinks / countBrokenLinks: thin data-layer wrapper --------

const { mockCreateServerDbClient } = vi.hoisted(() => ({ mockCreateServerDbClient: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ createServerDbClient: mockCreateServerDbClient }));

vi.mock("@/lib/data/pages", () => ({ listAllPages: vi.fn(async () => [{ slug: "about-us" }]) }));
vi.mock("@/lib/data/products", () => ({
  listAllProducts: vi.fn(async () => [{ id: "p1", slug: "gas-release-system", category_id: "c1" }]),
}));
vi.mock("@/lib/data/taxonomy", () => ({
  listProductCategories: vi.fn(async () => [{ id: "c1", slug: "artificial-lift" }]),
}));
vi.mock("@/lib/data/admin-entities", () => ({
  listEntityRows: vi.fn(async (table: string) => {
    if (table === "industries") return [{ id: "i1", slug: "oil-gas" }];
    if (table === "applications") return [];
    if (table === "news_posts") return [];
    if (table === "redirects") return [];
    return [];
  }),
}));

function fakeDb(pageBlocks: unknown[], sharedSectionBlocks: unknown[]) {
  return {
    from: (table: string) => ({
      select: () => {
        if (table === "page_blocks") return Promise.resolve({ data: pageBlocks, error: null });
        if (table === "shared_section_blocks") return Promise.resolve({ data: sharedSectionBlocks, error: null });
        throw new Error(`unexpected table ${table}`);
      },
    }),
  };
}

describe("listBrokenLinks / countBrokenLinks", () => {
  beforeEach(() => mockCreateServerDbClient.mockReset());

  it("flags a link to a page/product/industry slug that doesn't exist", async () => {
    mockCreateServerDbClient.mockReturnValue(
      fakeDb(
        [
          {
            id: "b1",
            type: "link_columns",
            data: { links: [{ href: "/industries/mining" }, { href: "/industries/oil-gas" }] },
            pages: { id: "page-1", title: "Home" },
          },
        ],
        [],
      ),
    );

    const links = await listBrokenLinks();
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ href: "/industries/mining", sourceLabel: "Home — link_columns block" });
    expect(await countBrokenLinks()).toBe(1);
  });

  it("does not flag a link that resolves against real content", async () => {
    mockCreateServerDbClient.mockReturnValue(
      fakeDb(
        [
          {
            id: "b1",
            type: "cta_band",
            data: { href: "/products/artificial-lift/gas-release-system" },
            pages: { id: "page-1", title: "Home" },
          },
        ],
        [],
      ),
    );
    expect(await listBrokenLinks()).toEqual([]);
  });

  it("scans shared_section_blocks too, and labels an orphaned block (no parent row) distinctly", async () => {
    mockCreateServerDbClient.mockReturnValue(
      fakeDb([], [{ id: "sb1", type: "link_columns", data: { href: "/no-such-page" }, shared_sections: null }]),
    );
    const links = await listBrokenLinks();
    expect(links).toEqual([{ sourceLabel: "(orphaned) link_columns block", sourceHref: null, href: "/no-such-page" }]);
  });

  it("dedupes an identical (source, href) pair found twice in the same block", async () => {
    mockCreateServerDbClient.mockReturnValue(
      fakeDb(
        [
          {
            id: "b1",
            type: "link_columns",
            data: { a: "/broken-one", b: "/broken-one" },
            pages: { id: "page-1", title: "Home" },
          },
        ],
        [],
      ),
    );
    expect(await listBrokenLinks()).toHaveLength(1);
  });
});
