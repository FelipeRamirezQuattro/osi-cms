import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { resourceListBlock } from "@/components/blocks/resource-list";
import type { Tables } from "@/lib/db/database.types";

/**
 * Task 9: `resource_list` needs its own data fetch (lib/data/resources.ts)
 * and must render a genuine, working empty state — the resources table
 * has 0 live rows today, so "renders nothing (a crash)" vs. "renders the
 * configured empty-state message" is the thing most likely to go wrong
 * unnoticed. Mirrors news-feed.test.tsx's approach: mock the data layer,
 * call Render directly, assert on the static markup.
 */

const { mockListResources, mockListProducts } = vi.hoisted(() => ({
  mockListResources: vi.fn(),
  mockListProducts: vi.fn(),
}));
vi.mock("@/lib/data/resources", () => ({ listResources: mockListResources }));
vi.mock("@/lib/data/products", () => ({ listProducts: mockListProducts }));

function resource(overrides: Partial<Tables<"resources">>): Tables<"resources"> {
  return {
    id: overrides.id ?? "r1",
    title: "Resource",
    kind: "brochure",
    category: null,
    file_url: "https://example.com/file.pdf",
    product_id: null,
    thumbnail_url: null,
    position: 0,
    status: "published",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as unknown as Tables<"resources">;
}

async function renderBlock(overrides: Partial<Parameters<typeof resourceListBlock.Render>[0]["data"]> = {}) {
  const defaults = resourceListBlock.defaults as Record<string, unknown>;
  const element = await resourceListBlock.Render({ data: { ...defaults, ...overrides } as never });
  const html = renderToStaticMarkup(element as React.ReactElement);
  const container = document.createElement("div");
  container.innerHTML = html;
  return container;
}

describe("resource_list block schema", () => {
  it("accepts the defaults", () => {
    expect(resourceListBlock.schema.safeParse(resourceListBlock.defaults).success).toBe(true);
  });

  it("accepts an optional category filter", () => {
    const defaults = resourceListBlock.defaults as Record<string, unknown>;
    expect(resourceListBlock.schema.safeParse({ ...defaults, category: "Certifications" }).success).toBe(true);
  });
});

describe("resource_list block render — empty state", () => {
  it("renders the configured empty-state message when 0 resources exist, not a crash", async () => {
    mockListResources.mockResolvedValue([]);
    mockListProducts.mockResolvedValue([]);

    const container = await renderBlock({ emptyStateMessage: "Nothing here yet." });
    expect(container.textContent).toContain("Nothing here yet.");
    expect(container.querySelector("select")).toBeNull();
  });

  it("passes the block's category preset through to listResources", async () => {
    mockListResources.mockResolvedValue([]);
    mockListProducts.mockResolvedValue([]);

    await renderBlock({ category: "Certifications" });
    expect(mockListResources).toHaveBeenCalledWith("Certifications");
  });
});

describe("resource_list block render — with data", () => {
  it("renders each resource's title and a working download link", async () => {
    mockListResources.mockResolvedValue([
      resource({ id: "r1", title: "Gas Release System Brochure", kind: "brochure", file_url: "https://example.com/grs.pdf" }),
    ]);
    mockListProducts.mockResolvedValue([]);

    const container = await renderBlock();
    expect(container.textContent).toContain("Gas Release System Brochure");
    const link = container.querySelector("a[href='https://example.com/grs.pdf']");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("target")).toBe("_blank");
  });

  it("resolves a resource's product name via product_id", async () => {
    mockListResources.mockResolvedValue([
      resource({ id: "r1", title: "Spec Sheet", product_id: "p1" }),
    ]);
    mockListProducts.mockResolvedValue([{ id: "p1", name: "Gas Release System" }] as unknown as Tables<"products">[]);

    const container = await renderBlock();
    expect(container.textContent).toContain("Gas Release System");
  });

  it("renders filter dropdowns when resources exist", async () => {
    mockListResources.mockResolvedValue([resource({ id: "r1", kind: "datasheet" })]);
    mockListProducts.mockResolvedValue([]);

    const container = await renderBlock();
    expect(container.querySelector('select[aria-label="Filter by type"]')).not.toBeNull();
  });
});
