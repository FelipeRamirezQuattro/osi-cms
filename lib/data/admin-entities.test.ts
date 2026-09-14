import { describe, expect, it, vi, beforeEach } from "vitest";
import { deleteEntityRow, insertEntityRow, moveEntityRow, updateEntityRow } from "@/lib/data/admin-entities";

/**
 * Task 5: every single-statement admin-entities write (insert/update/
 * delete) must call recordAudit() right after it succeeds, and the
 * up/down reorder control (moveEntityRow) must go through the
 * swap_entity_position RPC (0022_product_and_reorder_atomic.sql) instead
 * of two sequential updateEntityRow calls with no transaction between
 * them. Shape-tested against a fake Supabase-shaped client, same pattern
 * as lib/data/pages.test.ts / lib/data/admin-users.test.ts — no live DB.
 */
const { mockCreateServerDbClient } = vi.hoisted(() => ({ mockCreateServerDbClient: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ createServerDbClient: mockCreateServerDbClient }));

const { mockRecordAudit } = vi.hoisted(() => ({ mockRecordAudit: vi.fn() }));
vi.mock("@/lib/data/audit", () => ({ recordAudit: mockRecordAudit }));

/**
 * A minimal fake query builder: every chained method returns the same
 * chain object; `.single()`/`.maybeSingle()` and a bare `await` (via
 * `.then()`) all consume the next queued response, so it works whichever
 * way the real code terminates the chain.
 */
function createFakeDbClient(responses: unknown[]) {
  const queue = [...responses];
  const fromCalls: string[] = [];
  const rpcCalls: { name: string; args: unknown }[] = [];
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "order", "insert", "update", "delete"]) {
    chain[method] = () => chain;
  }
  chain.maybeSingle = async () => queue.shift();
  chain.single = async () => queue.shift();
  chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
    Promise.resolve(queue.shift()).then(resolve, reject);
  };

  return {
    from: (table: string) => {
      fromCalls.push(table);
      return chain;
    },
    rpc: async (name: string, args: unknown) => {
      rpcCalls.push({ name, args });
      return { data: null, error: null };
    },
    fromCalls,
    rpcCalls,
  };
}

beforeEach(() => {
  mockCreateServerDbClient.mockReset();
  mockRecordAudit.mockReset().mockResolvedValue(undefined);
});

describe("insertEntityRow", () => {
  it("records a 'create' audit entry with the new row's id and a short label, never the full payload", async () => {
    const fake = createFakeDbClient([{ data: { id: "row-1", name: "Oil & Gas", slug: "oil-gas" }, error: null }]);
    mockCreateServerDbClient.mockReturnValue(fake);

    const row = await insertEntityRow("industries", { name: "Oil & Gas", slug: "oil-gas" });

    expect(row).toEqual({ id: "row-1", name: "Oil & Gas", slug: "oil-gas" });
    expect(mockRecordAudit).toHaveBeenCalledWith("create", "industries", "row-1", { label: "Oil & Gas" });
  });
});

describe("updateEntityRow", () => {
  it("records an 'update' audit entry naming only the changed fields", async () => {
    const fake = createFakeDbClient([{ data: { id: "row-1", name: "Oil & Gas Renamed" }, error: null }]);
    mockCreateServerDbClient.mockReturnValue(fake);

    await updateEntityRow("industries", "row-1", { name: "Oil & Gas Renamed" });

    expect(mockRecordAudit).toHaveBeenCalledWith("update", "industries", "row-1", {
      label: "Oil & Gas Renamed",
      changedFields: ["name"],
    });
  });
});

describe("deleteEntityRow", () => {
  it("reads the row first (for a label) then records a 'delete' audit entry after the delete succeeds", async () => {
    const fake = createFakeDbClient([
      { data: { id: "row-1", name: "Oil & Gas" }, error: null }, // getEntityRow's own read
      { error: null }, // the delete itself
    ]);
    mockCreateServerDbClient.mockReturnValue(fake);

    await deleteEntityRow("industries", "row-1");

    expect(mockRecordAudit).toHaveBeenCalledWith("delete", "industries", "row-1", { label: "Oil & Gas" });
  });
});

describe("moveEntityRow — reorder swap is atomic", () => {
  it("calls swap_entity_position with both sibling ids instead of two sequential updates", async () => {
    const rows = [
      { id: "a", position: 0 },
      { id: "b", position: 1 },
      { id: "c", position: 2 },
    ];
    const fake = createFakeDbClient([{ data: rows, error: null }]);
    mockCreateServerDbClient.mockReturnValue(fake);

    await moveEntityRow("industries", "b", "up");

    expect(fake.rpcCalls).toEqual([
      { name: "swap_entity_position", args: { p_table: "industries", p_id_a: "b", p_id_b: "a" } },
    ]);
    // The RPC does its own audit write server-side — moveEntityRow itself
    // must not also call recordAudit (that would double-log one reorder).
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });

  it("is a no-op at the top of the list (nothing to swap with)", async () => {
    const rows = [
      { id: "a", position: 0 },
      { id: "b", position: 1 },
    ];
    const fake = createFakeDbClient([{ data: rows, error: null }]);
    mockCreateServerDbClient.mockReturnValue(fake);

    await moveEntityRow("industries", "a", "up");

    expect(fake.rpcCalls).toEqual([]);
  });
});
