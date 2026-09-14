import { describe, expect, it, vi, beforeEach } from "vitest";
import { updateSiteSettings } from "@/lib/data/settings";

/**
 * Task 5: site_settings' update (a single-statement write on a
 * singleton row with no meaningful uuid to log as entity_id) records an
 * 'update' audit entry naming only the changed field keys — not their
 * values, since there's no reason to duplicate contact info into
 * audit_log. Shape-tested against a fake Supabase-shaped client, same
 * pattern as lib/data/pages.test.ts.
 */
const { mockCreateServerDbClient } = vi.hoisted(() => ({ mockCreateServerDbClient: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ createServerDbClient: mockCreateServerDbClient }));

const { mockRecordAudit } = vi.hoisted(() => ({ mockRecordAudit: vi.fn() }));
vi.mock("@/lib/data/audit", () => ({ recordAudit: mockRecordAudit }));

function createFakeDbClient() {
  const chain: Record<string, unknown> = {};
  chain.update = () => chain;
  chain.eq = async () => ({ error: null });
  return { from: () => chain };
}

beforeEach(() => {
  mockCreateServerDbClient.mockReset();
  mockRecordAudit.mockReset().mockResolvedValue(undefined);
});

describe("updateSiteSettings", () => {
  it("records an 'update' audit entry naming only the changed field keys, not their values", async () => {
    mockCreateServerDbClient.mockReturnValue(createFakeDbClient());

    await updateSiteSettings({ phone: "+1 555 0100", email: "hello@example.test" });

    expect(mockRecordAudit).toHaveBeenCalledWith("update", "site_settings", null, {
      changedFields: ["phone", "email"],
    });
  });
});
