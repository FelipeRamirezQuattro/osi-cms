import { describe, expect, it, vi, beforeEach } from "vitest";
import { inviteAdminUser, updateAdminUserRow } from "@/lib/data/admin-users";

/**
 * Task 4's last-admin protection: updateAdminUserRow must refuse a
 * role/active-status change that would leave zero active admins
 * (deactivating the last admin, or demoting the last admin to editor).
 * Shape-tested against a fake Supabase-shaped client (same pattern as
 * lib/data/pages.test.ts), not a live DB — see the Task 1 brief's ruling
 * on why a full round-trip is out of scope here.
 *
 * Also covers the review-flagged bypass: inviteAdminUser's upsert can
 * silently re-role/reactivate an *existing* profile (the "this email
 * was already invited" branch) — that path shares the same
 * assertDoesNotOrphanAdmins guard as updateAdminUserRow, not a second,
 * unguarded one.
 */
const { mockCreateServerDbClient, mockCreateServiceRoleDbClient } = vi.hoisted(() => ({
  mockCreateServerDbClient: vi.fn(),
  mockCreateServiceRoleDbClient: vi.fn(),
}));
vi.mock("@/lib/db/client", () => ({
  createServerDbClient: mockCreateServerDbClient,
  createServiceRoleDbClient: mockCreateServiceRoleDbClient,
}));

// Task 5 added a recordAudit() call after every successful admin-user
// mutation — mocked out here so these tests keep isolating the
// last-admin-protection logic (assertDoesNotOrphanAdmins) from audit
// logging, which has its own coverage.
const { mockRecordAudit } = vi.hoisted(() => ({ mockRecordAudit: vi.fn() }));
vi.mock("@/lib/data/audit", () => ({ recordAudit: mockRecordAudit }));

/**
 * A minimal fake query builder: every chained method (`select`, `eq`,
 * `neq`, `update`, `order`) returns the same chain object, so it works
 * whether the real code terminates the chain with `.maybeSingle()` /
 * `.single()` (consumes the next queued response immediately) or just
 * awaits the builder directly, the way supabase-js's builder is itself
 * thenable (the fake's own `.then()` consumes the next queued response).
 */
function createFakeDbClient(responses: unknown[]) {
  const queue = [...responses];
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "neq", "update", "order", "upsert"]) {
    chain[method] = () => chain;
  }
  chain.maybeSingle = async () => queue.shift();
  chain.single = async () => queue.shift();
  chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
    Promise.resolve(queue.shift()).then(resolve, reject);
  };

  return { from: () => chain };
}

/** A fake service-role client covering only what inviteAdminUser calls. */
function createFakeServiceClient(opts: {
  inviteError?: { message: string } | null;
  newUserId?: string;
  existingUsers?: { id: string; email: string }[];
}) {
  const { inviteError = null, newUserId = "new-user-id", existingUsers = [] } = opts;
  return {
    auth: {
      admin: {
        inviteUserByEmail: async () =>
          inviteError ? { data: null, error: inviteError } : { data: { user: { id: newUserId } }, error: null },
        listUsers: async () => ({ data: { users: existingUsers }, error: null }),
      },
    },
  };
}

describe("updateAdminUserRow — last-admin protection", () => {
  beforeEach(() => {
    mockCreateServerDbClient.mockReset();
    mockRecordAudit.mockReset().mockResolvedValue(undefined);
  });

  it("rejects deactivating the last active admin", async () => {
    const fake = createFakeDbClient([
      { data: { role: "admin", is_active: true }, error: null }, // current row lookup
      { count: 0, error: null }, // other active admins
    ]);
    mockCreateServerDbClient.mockReturnValue(fake);

    await expect(updateAdminUserRow("admin-1", { is_active: false })).rejects.toThrow(/last active admin/i);
  });

  it("rejects demoting the last active admin to editor", async () => {
    const fake = createFakeDbClient([
      { data: { role: "admin", is_active: true }, error: null },
      { count: 0, error: null },
    ]);
    mockCreateServerDbClient.mockReturnValue(fake);

    await expect(updateAdminUserRow("admin-1", { role: "editor" })).rejects.toThrow(/last active admin/i);
  });

  it("allows deactivating an admin when another active admin remains", async () => {
    const fake = createFakeDbClient([
      { data: { role: "admin", is_active: true }, error: null },
      { count: 1, error: null }, // one other active admin
      { error: null }, // the update itself
    ]);
    mockCreateServerDbClient.mockReturnValue(fake);

    await expect(updateAdminUserRow("admin-1", { is_active: false })).resolves.toBeUndefined();
  });

  it("allows deactivating an editor without ever checking the admin count", async () => {
    const fake = createFakeDbClient([
      { data: { role: "editor", is_active: true }, error: null },
      { error: null }, // the update itself — no count query in between
    ]);
    mockCreateServerDbClient.mockReturnValue(fake);

    await expect(updateAdminUserRow("editor-1", { is_active: false })).resolves.toBeUndefined();
  });

  it("allows re-activating or promoting a user without checking the admin count", async () => {
    const fake = createFakeDbClient([
      { data: { role: "editor", is_active: false }, error: null },
      { error: null },
    ]);
    mockCreateServerDbClient.mockReturnValue(fake);

    await expect(updateAdminUserRow("user-1", { role: "admin", is_active: true })).resolves.toBeUndefined();
  });
});

describe("inviteAdminUser — shares the same last-admin guard", () => {
  beforeEach(() => {
    mockCreateServerDbClient.mockReset();
    mockCreateServiceRoleDbClient.mockReset();
    mockRecordAudit.mockReset().mockResolvedValue(undefined);
  });

  it("rejects re-inviting the last active admin's own email as editor", async () => {
    // inviteUserByEmail fails ("already registered") because this email
    // already has an account — the re-role/reactivate upsert branch.
    mockCreateServiceRoleDbClient.mockReturnValue(
      createFakeServiceClient({
        inviteError: { message: "User already registered" },
        existingUsers: [{ id: "admin-1", email: "admin@example.com" }],
      }),
    );
    const fake = createFakeDbClient([
      { data: { role: "admin", is_active: true }, error: null }, // current row lookup
      { count: 0, error: null }, // other active admins
    ]);
    mockCreateServerDbClient.mockReturnValue(fake);

    await expect(inviteAdminUser("admin@example.com", "editor")).rejects.toThrow(/last active admin/i);
  });

  it("allows re-inviting an existing admin as editor when another active admin remains", async () => {
    mockCreateServiceRoleDbClient.mockReturnValue(
      createFakeServiceClient({
        inviteError: { message: "User already registered" },
        existingUsers: [{ id: "admin-1", email: "admin@example.com" }],
      }),
    );
    const fake = createFakeDbClient([
      { data: { role: "admin", is_active: true }, error: null },
      { count: 1, error: null }, // one other active admin
      { error: null }, // the upsert itself
    ]);
    mockCreateServerDbClient.mockReturnValue(fake);

    await expect(inviteAdminUser("admin@example.com", "editor")).resolves.toBeUndefined();
  });

  it("allows inviting a brand-new email without ever checking the admin count", async () => {
    mockCreateServiceRoleDbClient.mockReturnValue(createFakeServiceClient({ newUserId: "brand-new-id" }));
    const fake = createFakeDbClient([
      { data: null, error: null }, // no existing profile for this user_id
      { error: null }, // the upsert itself — no count query in between
    ]);
    mockCreateServerDbClient.mockReturnValue(fake);

    await expect(inviteAdminUser("new@example.com", "editor")).resolves.toBeUndefined();
  });
});
