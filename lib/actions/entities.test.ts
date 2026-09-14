import { describe, expect, it, vi, beforeEach } from "vitest";
import { saveEntityAction } from "@/lib/actions/entities";

/**
 * Task 4 review finding fix: saveEntityAction must run every status
 * change through requirePublishCapabilityForStatusChange (see
 * lib/auth/index.test.ts for that function's own branching-logic
 * coverage) for any entity with a `status` field (config.hasStatus) —
 * not just requireCapability("edit_drafts"), which an editor already
 * has. Entities with no status field at all (e.g. "redirects") must
 * skip the guard entirely — there's no status to transition.
 *
 * requirePublishCapabilityForStatusChange itself is mocked directly
 * here so these tests isolate the *wiring*, not its own logic.
 */
const { mockRequireCapability, mockRequirePublish } = vi.hoisted(() => ({
  mockRequireCapability: vi.fn(),
  mockRequirePublish: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  requireCapability: mockRequireCapability,
  requirePublishCapabilityForStatusChange: mockRequirePublish,
}));

const { mockGetEntityRow, mockUpdateEntityRow, mockInsertEntityRow, mockListEntityRows } = vi.hoisted(() => ({
  mockGetEntityRow: vi.fn(),
  mockUpdateEntityRow: vi.fn(),
  mockInsertEntityRow: vi.fn(),
  mockListEntityRows: vi.fn(),
}));
vi.mock("@/lib/data/admin-entities", () => ({
  getEntityRow: mockGetEntityRow,
  updateEntityRow: mockUpdateEntityRow,
  insertEntityRow: mockInsertEntityRow,
  listEntityRows: mockListEntityRows,
  deleteEntityRow: vi.fn(),
  moveEntityRow: vi.fn(),
  listRelationOptions: vi.fn(),
}));

const adminSession = { userId: "admin-1", email: "admin@example.com", role: "admin" as const, fullName: "Ada Min" };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireCapability.mockResolvedValue(adminSession);
});

describe("saveEntityAction gates status transitions for hasStatus entities", () => {
  it("checks the transition using the existing row's pre-save status for an entity with a status field (industries)", async () => {
    mockGetEntityRow.mockResolvedValue({ id: "ind-1", status: "draft" });
    mockRequirePublish.mockResolvedValue(undefined);
    mockUpdateEntityRow.mockResolvedValue({ id: "ind-1" });

    const result = await saveEntityAction("industries", "ind-1", { name: "Oil & Gas", slug: "oil-gas", status: "published" });

    expect(mockGetEntityRow).toHaveBeenCalledWith("industries", "ind-1");
    expect(mockRequirePublish).toHaveBeenCalledWith("draft", "published");
    expect(mockUpdateEntityRow).toHaveBeenCalled();
    expect(result).toEqual({ status: "success", id: "ind-1" });
  });

  it("never attempts the write when requirePublishCapabilityForStatusChange rejects (editor trying to publish)", async () => {
    mockGetEntityRow.mockResolvedValue({ id: "ind-1", status: "draft" });
    mockRequirePublish.mockRejectedValue(new Error("REDIRECT:/admin?error=not-authorized"));

    await expect(
      saveEntityAction("industries", "ind-1", { name: "Oil & Gas", slug: "oil-gas", status: "published" }),
    ).rejects.toThrow("REDIRECT:/admin?error=not-authorized");
    expect(mockUpdateEntityRow).not.toHaveBeenCalled();
  });

  it("passes null as the current status for a brand-new industries row", async () => {
    mockInsertEntityRow.mockResolvedValue({ id: "new-id" });
    mockListEntityRows.mockResolvedValue([]);
    mockRequirePublish.mockResolvedValue(undefined);

    await saveEntityAction("industries", null, { name: "Oil & Gas", slug: "oil-gas", status: "draft" });

    expect(mockGetEntityRow).not.toHaveBeenCalled();
    expect(mockRequirePublish).toHaveBeenCalledWith(null, "draft");
  });

  it("skips the guard entirely for an entity with no status field (redirects)", async () => {
    mockUpdateEntityRow.mockResolvedValue({ id: "r1" });

    await saveEntityAction("redirects", "r1", { from_path: "/old", to_path: "/new", status_code: "301" });

    expect(mockGetEntityRow).not.toHaveBeenCalled();
    expect(mockRequirePublish).not.toHaveBeenCalled();
    expect(mockUpdateEntityRow).toHaveBeenCalled();
  });
});
