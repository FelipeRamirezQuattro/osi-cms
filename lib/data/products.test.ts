import { describe, expect, it, vi, beforeEach } from "vitest";
import { countProductsByCategory, deleteProduct, listRelatedProducts, saveProduct } from "@/lib/data/products";

/**
 * Task 5: saveProduct/deleteProduct must go through the
 * save_product_atomic/delete_product_atomic RPCs (0022_product_and_
 * reorder_atomic.sql) — never the old raw multi-statement
 * createProductRow/updateProductRow/saveProductChildren/deleteProductRow
 * sequence, which had zero transaction and zero error-checking on the
 * child-table deletes. Shape-tested against a fake Supabase-shaped
 * client, same pattern as lib/data/pages.test.ts — genuine rollback
 * behavior is a property of the real SQL transaction and isn't
 * verifiable at this level; see the task report for that caveat.
 */
const { mockCreateServerDbClient } = vi.hoisted(() => ({ mockCreateServerDbClient: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ createServerDbClient: mockCreateServerDbClient }));

function createFakeDbClient(rpcResult: { data: unknown; error: unknown }) {
  const rpcCalls: { name: string; args: unknown }[] = [];
  return {
    from: () => {
      throw new Error("saveProduct/deleteProduct must go through .rpc(), never .from() directly");
    },
    rpc: async (name: string, args: unknown) => {
      rpcCalls.push({ name, args });
      return rpcResult;
    },
    rpcCalls,
  };
}

beforeEach(() => {
  mockCreateServerDbClient.mockReset();
});

describe("saveProduct", () => {
  it("calls save_product_atomic with the product id, meta, and all 6 child/junction arrays, and returns the RPC's id", async () => {
    const fake = createFakeDbClient({ data: "product-1", error: null });
    mockCreateServerDbClient.mockReturnValue(fake);

    const benefits = [{ title: "Fast" }];
    const stages = [{ title: "Stage 1" }];
    const specs = [{ label: "Weight", value: "10kg" }];
    const industries = ["ind-1"];
    const applications = ["app-1"];
    const related = ["prod-2"];

    const result = await saveProduct(
      "product-1",
      { name: "Widget", status: "draft" },
      benefits,
      stages,
      specs,
      industries,
      applications,
      related,
    );

    expect(result).toBe("product-1");
    expect(fake.rpcCalls).toEqual([
      {
        name: "save_product_atomic",
        args: {
          p_product_id: "product-1",
          p_meta: { name: "Widget", status: "draft" },
          p_benefits: benefits,
          p_stages: stages,
          p_specs: specs,
          p_industry_ids: industries,
          p_application_ids: applications,
          p_related_ids: related,
        },
      },
    ]);
  });

  it("omits p_product_id (sends undefined, not null) for a brand-new product", async () => {
    // save_product_atomic's SQL parameter is `p_product_id uuid default
    // null` (required for parameter ordering — see the migration's
    // comment), which the generated Args type surfaces as an optional
    // key (`p_product_id?: string`), not `string | null` — so the
    // create path must send `undefined`, matching recordAudit's own
    // `entityId ?? undefined` pattern for the same kind of defaulted arg.
    const fake = createFakeDbClient({ data: "new-id", error: null });
    mockCreateServerDbClient.mockReturnValue(fake);

    await saveProduct(null, { name: "Widget" }, [], [], [], [], [], []);

    const args = fake.rpcCalls[0].args as Record<string, unknown>;
    expect(args.p_product_id).toBeUndefined();
    expect("p_product_id" in args).toBe(true);
  });

  it("throws when the RPC reports an error, rather than returning a partial result", async () => {
    const fake = createFakeDbClient({ data: null, error: new Error("constraint violation") });
    mockCreateServerDbClient.mockReturnValue(fake);

    await expect(saveProduct("p1", { name: "Widget" }, [], [], [], [], [], [])).rejects.toThrow(
      "constraint violation",
    );
  });
});

/**
 * Task 8 item #1: the product-categories delete guard in
 * lib/actions/entities.ts counts referencing products before allowing a
 * delete (category_id is nullable with `on delete set null` at the DB
 * level, which would silently orphan a product's canonical URL rather
 * than reject the delete — see that action's own comment).
 */
describe("countProductsByCategory", () => {
  function createFakeCountClient(count: number | null) {
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq"]) chain[method] = () => chain;
    chain.then = (resolve: (v: unknown) => void) => Promise.resolve({ count, error: null }).then(resolve);
    return { from: () => chain };
  }

  it("returns the number of products referencing a category", async () => {
    mockCreateServerDbClient.mockReturnValue(createFakeCountClient(3));
    expect(await countProductsByCategory("cat-1")).toBe(3);
  });

  it("returns 0 when nothing references the category", async () => {
    mockCreateServerDbClient.mockReturnValue(createFakeCountClient(0));
    expect(await countProductsByCategory("cat-1")).toBe(0);
  });

  it("treats a null count as 0", async () => {
    mockCreateServerDbClient.mockReturnValue(createFakeCountClient(null));
    expect(await countProductsByCategory("cat-1")).toBe(0);
  });
});

describe("deleteProduct", () => {
  it("calls delete_product_atomic with the product id", async () => {
    const fake = createFakeDbClient({ data: null, error: null });
    mockCreateServerDbClient.mockReturnValue(fake);

    await deleteProduct("product-1");

    expect(fake.rpcCalls).toEqual([{ name: "delete_product_atomic", args: { p_product_id: "product-1" } }]);
  });
});

/**
 * Task 7 item #6: product_related had zero query anywhere. Two queries
 * (link rows, then the target products) rather than one ambiguous
 * embedded select — see listRelatedProducts's own comment for why.
 */
describe("listRelatedProducts", () => {
  function createFakeFromClient(responses: unknown[]) {
    const queue = [...responses];
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "order", "in"]) {
      chain[method] = () => chain;
    }
    chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
      Promise.resolve(queue.shift()).then(resolve, reject);
    };
    return { from: () => chain };
  }

  it("returns related products in link position order, published + locale filtered", async () => {
    const fake = createFakeFromClient([
      {
        data: [
          { related_product_id: "p2", position: 0 },
          { related_product_id: "p3", position: 1 },
        ],
        error: null,
      },
      {
        data: [{ id: "p3", slug: "s3", name: "Third", summary: "sum3", product_categories: { slug: "cat" } }],
        error: null,
      },
    ]);
    mockCreateServerDbClient.mockReturnValue(fake);

    // p2 isn't in the second query's result (e.g. draft or wrong locale) —
    // it's silently dropped, not rendered as a broken card.
    const result = await listRelatedProducts("p1");
    expect(result).toEqual([{ slug: "s3", name: "Third", summary: "sum3", categorySlug: "cat" }]);
  });

  it("returns [] without a second query when there are no link rows", async () => {
    const fake = createFakeFromClient([{ data: [], error: null }]);
    mockCreateServerDbClient.mockReturnValue(fake);

    expect(await listRelatedProducts("p1")).toEqual([]);
  });
});
