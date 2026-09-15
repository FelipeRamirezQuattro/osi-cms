import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getApplicationBySlug,
  getIndustryBySlug,
  listProductsByApplication,
  listProductsByIndustry,
} from "@/lib/data/taxonomy";

/**
 * Task 8 item #5: getIndustryBySlug/getApplicationBySlug and the
 * products-by-taxonomy join functions had no query anywhere before this.
 * Shape-tested against a fake Supabase-shaped client, same
 * two-query-around-the-junction-table pattern as
 * lib/data/products.ts's listRelatedProducts (see that function's own
 * comment for why: PostgREST's embed syntax needs an explicit FK hint to
 * disambiguate a junction table with two FKs, and a plain two-query scan
 * sidesteps that entirely).
 */
const { mockCreateServerDbClient } = vi.hoisted(() => ({ mockCreateServerDbClient: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ createServerDbClient: mockCreateServerDbClient }));

beforeEach(() => {
  mockCreateServerDbClient.mockReset();
});

function createFakeFromClient(responsesByTable: Record<string, unknown[]>) {
  const queues = Object.fromEntries(Object.entries(responsesByTable).map(([k, v]) => [k, [...v]]));
  return {
    from: (table: string) => {
      const chain: Record<string, unknown> = {};
      for (const method of ["select", "eq", "order", "in"]) chain[method] = () => chain;
      chain.maybeSingle = () => Promise.resolve(queues[table]?.shift());
      chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
        Promise.resolve(queues[table]?.shift()).then(resolve, reject);
      };
      return chain;
    },
  };
}

describe("getIndustryBySlug / getApplicationBySlug", () => {
  it("returns the published industry matching the slug", async () => {
    const fake = createFakeFromClient({
      industries: [{ data: { id: "ind-1", slug: "oil-gas", name: "Oil & Gas" }, error: null }],
    });
    mockCreateServerDbClient.mockReturnValue(fake);

    expect(await getIndustryBySlug("oil-gas")).toEqual({ id: "ind-1", slug: "oil-gas", name: "Oil & Gas" });
  });

  it("returns null when no published industry matches", async () => {
    const fake = createFakeFromClient({ industries: [{ data: null, error: null }] });
    mockCreateServerDbClient.mockReturnValue(fake);

    expect(await getIndustryBySlug("nope")).toBeNull();
  });

  it("returns the published application matching the slug", async () => {
    const fake = createFakeFromClient({
      applications: [{ data: { id: "app-1", slug: "artificial-lift", name: "Artificial Lift" }, error: null }],
    });
    mockCreateServerDbClient.mockReturnValue(fake);

    expect(await getApplicationBySlug("artificial-lift")).toEqual({
      id: "app-1",
      slug: "artificial-lift",
      name: "Artificial Lift",
    });
  });
});

describe("listProductsByIndustry", () => {
  it("returns published products linked via product_industries, with categorySlug flattened", async () => {
    const fake = createFakeFromClient({
      product_industries: [{ data: [{ product_id: "p1" }, { product_id: "p2" }], error: null }],
      products: [
        {
          data: [
            { id: "p1", slug: "s1", name: "One", status: "published", product_categories: { slug: "cat-a" } },
          ],
          error: null,
        },
      ],
    });
    mockCreateServerDbClient.mockReturnValue(fake);

    const result = await listProductsByIndustry("ind-1");
    expect(result).toEqual([
      expect.objectContaining({ id: "p1", slug: "s1", name: "One", categorySlug: "cat-a" }),
    ]);
  });

  it("returns [] without a second query when there are no link rows", async () => {
    const fake = createFakeFromClient({ product_industries: [{ data: [], error: null }] });
    mockCreateServerDbClient.mockReturnValue(fake);

    expect(await listProductsByIndustry("ind-1")).toEqual([]);
  });
});

describe("listProductsByApplication", () => {
  it("returns published products linked via product_applications, with categorySlug flattened", async () => {
    const fake = createFakeFromClient({
      product_applications: [{ data: [{ product_id: "p3" }], error: null }],
      products: [
        {
          data: [{ id: "p3", slug: "s3", name: "Three", product_categories: { slug: "cat-b" } }],
          error: null,
        },
      ],
    });
    mockCreateServerDbClient.mockReturnValue(fake);

    const result = await listProductsByApplication("app-1");
    expect(result).toEqual([
      expect.objectContaining({ id: "p3", slug: "s3", name: "Three", categorySlug: "cat-b" }),
    ]);
  });

  it("returns [] without a second query when there are no link rows", async () => {
    const fake = createFakeFromClient({ product_applications: [{ data: [], error: null }] });
    mockCreateServerDbClient.mockReturnValue(fake);

    expect(await listProductsByApplication("app-1")).toEqual([]);
  });
});
