import { describe, expect, it, vi, beforeEach } from "vitest";
import { listAuditLog, recordAudit } from "@/lib/data/audit";

/**
 * lib/data/audit.ts is the cross-cutting home for recordAudit() (moved
 * here from lib/data/pages.ts in Task 5, since every lib/data/*.ts
 * repository calls it now, not just pages) plus the read side backing
 * the new /admin/audit-log screen. Shape-tested against a fake
 * Supabase-shaped client, same pattern as lib/data/pages.test.ts.
 */
const { mockCreateServerDbClient, mockCreateServiceRoleDbClient } = vi.hoisted(() => ({
  mockCreateServerDbClient: vi.fn(),
  mockCreateServiceRoleDbClient: vi.fn(),
}));
vi.mock("@/lib/db/client", () => ({
  createServerDbClient: mockCreateServerDbClient,
  createServiceRoleDbClient: mockCreateServiceRoleDbClient,
}));

function createFakeDbClient(rpcResult: { data: unknown; error: unknown }) {
  const rpcCalls: { name: string; args: unknown }[] = [];
  return {
    rpc: async (name: string, args: unknown) => {
      rpcCalls.push({ name, args });
      return rpcResult;
    },
    rpcCalls,
  };
}

/** A fake query builder that records every filter call it received, then resolves to `result` when awaited. */
function createFakeListClient(rows: unknown[]) {
  const calls: { method: string; args: unknown[] }[] = [];
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "gte", "lte", "order", "limit"]) {
    chain[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return chain;
    };
  }
  chain.then = (resolve: (v: unknown) => void) => resolve({ data: rows, error: null });
  return { from: () => chain, calls };
}

function createFakeServiceClient(users: { id: string; email: string }[]) {
  return { auth: { admin: { listUsers: async () => ({ data: { users }, error: null }) } } };
}

beforeEach(() => {
  mockCreateServerDbClient.mockReset();
  mockCreateServiceRoleDbClient.mockReset();
});

describe("recordAudit", () => {
  it("calls the record_audit RPC with the given action/entity/entityId/diff", async () => {
    const fake = createFakeDbClient({ data: null, error: null });
    mockCreateServerDbClient.mockReturnValue(fake);

    await recordAudit("update", "product", "p1", { status: "published" });

    expect(fake.rpcCalls).toEqual([
      {
        name: "record_audit",
        args: { p_action: "update", p_entity: "product", p_entity_id: "p1", p_diff: { status: "published" } },
      },
    ]);
  });

  it("throws when the RPC reports an error", async () => {
    const fake = createFakeDbClient({ data: null, error: new Error("not authorized") });
    mockCreateServerDbClient.mockReturnValue(fake);

    await expect(recordAudit("update", "product", "p1")).rejects.toThrow("not authorized");
  });
});

describe("listAuditLog", () => {
  it("applies actor/entity/action/date filters and resolves actor_id to an email via the service-role admin API", async () => {
    const listClient = createFakeListClient([
      { id: "log-1", actor_id: "user-1", entity: "product", entity_id: "p1", action: "update", diff: null, created_at: "2026-01-01T00:00:00.000Z" },
    ]);
    mockCreateServerDbClient.mockReturnValue(listClient);
    mockCreateServiceRoleDbClient.mockReturnValue(createFakeServiceClient([{ id: "user-1", email: "editor@example.test" }]));

    const result = await listAuditLog({
      actorId: "user-1",
      entity: "product",
      action: "update",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });

    expect(result).toEqual([
      {
        id: "log-1",
        actor_id: "user-1",
        entity: "product",
        entity_id: "p1",
        action: "update",
        diff: null,
        created_at: "2026-01-01T00:00:00.000Z",
        actorEmail: "editor@example.test",
      },
    ]);
    const eqCalls = listClient.calls.filter((c) => c.method === "eq");
    expect(eqCalls).toEqual([
      { method: "eq", args: ["actor_id", "user-1"] },
      { method: "eq", args: ["entity", "product"] },
      { method: "eq", args: ["action", "update"] },
    ]);
    expect(listClient.calls.some((c) => c.method === "gte" && c.args[0] === "created_at")).toBe(true);
    expect(listClient.calls.some((c) => c.method === "lte" && c.args[0] === "created_at")).toBe(true);
  });

  it("skips the service-role lookup entirely when there are no rows", async () => {
    mockCreateServerDbClient.mockReturnValue(createFakeListClient([]));

    const result = await listAuditLog({});

    expect(result).toEqual([]);
    expect(mockCreateServiceRoleDbClient).not.toHaveBeenCalled();
  });

  it("labels an actor with no resolvable email as null rather than throwing", async () => {
    mockCreateServerDbClient.mockReturnValue(
      createFakeListClient([
        { id: "log-1", actor_id: "deleted-user", entity: "page", entity_id: null, action: "delete", diff: null, created_at: "2026-01-01T00:00:00.000Z" },
      ]),
    );
    mockCreateServiceRoleDbClient.mockReturnValue(createFakeServiceClient([]));

    const result = await listAuditLog({});

    expect(result[0].actorEmail).toBeNull();
  });
});
