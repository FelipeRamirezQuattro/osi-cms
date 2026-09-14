import { describe, expect, it, vi, beforeEach } from "vitest";
import { deleteProduct, saveProduct } from "@/lib/data/products";

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
  it("calls save_product_atomic with the product id, meta, and all 5 child arrays, and returns the RPC's id", async () => {
    const fake = createFakeDbClient({ data: "product-1", error: null });
    mockCreateServerDbClient.mockReturnValue(fake);

    const benefits = [{ title: "Fast" }];
    const stages = [{ title: "Stage 1" }];
    const specs = [{ label: "Weight", value: "10kg" }];
    const industries = ["ind-1"];
    const applications = ["app-1"];

    const result = await saveProduct("product-1", { name: "Widget", status: "draft" }, benefits, stages, specs, industries, applications);

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
        },
      },
    ]);
  });

  it("passes null as p_product_id for a brand-new product", async () => {
    const fake = createFakeDbClient({ data: "new-id", error: null });
    mockCreateServerDbClient.mockReturnValue(fake);

    await saveProduct(null, { name: "Widget" }, [], [], [], [], []);

    expect(fake.rpcCalls[0].args).toMatchObject({ p_product_id: null });
  });

  it("throws when the RPC reports an error, rather than returning a partial result", async () => {
    const fake = createFakeDbClient({ data: null, error: new Error("constraint violation") });
    mockCreateServerDbClient.mockReturnValue(fake);

    await expect(saveProduct("p1", { name: "Widget" }, [], [], [], [], [])).rejects.toThrow("constraint violation");
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
