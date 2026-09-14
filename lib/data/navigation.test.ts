import { describe, expect, it, vi, beforeEach } from "vitest";
import { createNavItem, deleteNavItem, moveNavItem, updateNavItem } from "@/lib/data/navigation";

/**
 * Task 5: nav_items create/update/delete each get a direct recordAudit()
 * call (single-statement writes — no new atomic RPC needed), while
 * moveNavItem's reorder swap goes through swap_nav_item_position
 * (0022_product_and_reorder_atomic.sql) instead of two sequential
 * updateNavItem calls — which would otherwise both run through
 * updateNavItem's own recordAudit and double-log one reorder as two
 * "update" entries. Shape-tested against a fake Supabase-shaped client,
 * same pattern as lib/data/pages.test.ts.
 */
const { mockCreateServerDbClient } = vi.hoisted(() => ({ mockCreateServerDbClient: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ createServerDbClient: mockCreateServerDbClient }));

const { mockRecordAudit } = vi.hoisted(() => ({ mockRecordAudit: vi.fn() }));
vi.mock("@/lib/data/audit", () => ({ recordAudit: mockRecordAudit }));

function createFakeDbClient(responses: unknown[]) {
  const queue = [...responses];
  const rpcCalls: { name: string; args: unknown }[] = [];
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "is", "order", "insert", "update", "delete"]) {
    chain[method] = () => chain;
  }
  chain.maybeSingle = async () => queue.shift();
  chain.single = async () => queue.shift();
  chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
    Promise.resolve(queue.shift()).then(resolve, reject);
  };

  return {
    from: () => chain,
    rpc: async (name: string, args: unknown) => {
      rpcCalls.push({ name, args });
      return { data: null, error: null };
    },
    rpcCalls,
  };
}

beforeEach(() => {
  mockCreateServerDbClient.mockReset();
  mockRecordAudit.mockReset().mockResolvedValue(undefined);
});

describe("createNavItem", () => {
  it("records a 'create' audit entry after the insert succeeds", async () => {
    const fake = createFakeDbClient([
      { data: { id: "nav-1", label: "Products", href: "/products" }, error: null },
    ]);
    mockCreateServerDbClient.mockReturnValue(fake);

    await createNavItem({ menu_id: "m1", parent_id: null, label: "Products", href: "/products", is_external: false });

    expect(mockRecordAudit).toHaveBeenCalledWith("create", "nav_item", "nav-1", {
      label: "Products",
      href: "/products",
    });
  });
});

describe("updateNavItem", () => {
  it("records an 'update' audit entry after the update succeeds", async () => {
    const fake = createFakeDbClient([{ error: null }]);
    mockCreateServerDbClient.mockReturnValue(fake);

    await updateNavItem("nav-1", { label: "Products (new)", href: "/products", is_external: false, parent_id: null });

    expect(mockRecordAudit).toHaveBeenCalledWith("update", "nav_item", "nav-1", {
      label: "Products (new)",
      href: "/products",
    });
  });
});

describe("deleteNavItem", () => {
  it("reads the item first (for a label) then records a 'delete' audit entry", async () => {
    const fake = createFakeDbClient([
      { data: { label: "Products", href: "/products" }, error: null }, // the pre-delete read
      { error: null }, // the delete itself
    ]);
    mockCreateServerDbClient.mockReturnValue(fake);

    await deleteNavItem("nav-1");

    expect(mockRecordAudit).toHaveBeenCalledWith("delete", "nav_item", "nav-1", {
      label: "Products",
      href: "/products",
    });
  });
});

describe("moveNavItem — reorder swap is atomic", () => {
  it("calls swap_nav_item_position with both sibling ids instead of two sequential updates", async () => {
    const item = { id: "b", menu_id: "m1", parent_id: null, position: 1 };
    const siblings = [
      { id: "a", menu_id: "m1", parent_id: null, position: 0 },
      { id: "b", menu_id: "m1", parent_id: null, position: 1 },
      { id: "c", menu_id: "m1", parent_id: null, position: 2 },
    ];
    const fake = createFakeDbClient([
      { data: item, error: null }, // the item lookup
      { data: siblings, error: null }, // the sibling list
    ]);
    mockCreateServerDbClient.mockReturnValue(fake);

    await moveNavItem("b", "down");

    expect(fake.rpcCalls).toEqual([{ name: "swap_nav_item_position", args: { p_id_a: "b", p_id_b: "c" } }]);
    // The RPC does its own audit write server-side.
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });
});
