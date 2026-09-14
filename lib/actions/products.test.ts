import { describe, expect, it, vi, beforeEach } from "vitest";
import { saveProductAction, deleteProductAction } from "@/lib/actions/products";

const { mockRedirect } = vi.hoisted(() => ({ mockRedirect: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

/**
 * Task 4 review finding fix: saveProductAction must run every status
 * change through requirePublishCapabilityForStatusChange (defined in
 * lib/auth/index.ts, unit-tested on its own in lib/auth/index.test.ts)
 * before writing anything, using the row's pre-save status (fetched via
 * the same generic getEntityRow the entity admin uses) — not just
 * requireCapability("edit_drafts"), which an editor already has.
 *
 * requirePublishCapabilityForStatusChange itself is mocked directly here
 * (not exercised for real) so these tests isolate the *wiring* — right
 * arguments, right short-circuit on rejection — from its own branching
 * logic, which lib/auth/index.test.ts already covers.
 */
const { mockRequireCapability, mockRequirePublish } = vi.hoisted(() => ({
  mockRequireCapability: vi.fn(),
  mockRequirePublish: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  requireCapability: mockRequireCapability,
  requirePublishCapabilityForStatusChange: mockRequirePublish,
}));

const { mockGetEntityRow, mockListEntityRows } = vi.hoisted(() => ({
  mockGetEntityRow: vi.fn(),
  mockListEntityRows: vi.fn(),
}));
vi.mock("@/lib/data/admin-entities", () => ({
  getEntityRow: mockGetEntityRow,
  listEntityRows: mockListEntityRows,
  listRelationOptions: vi.fn(),
  moveEntityRow: vi.fn(),
}));

const { mockSaveProduct, mockDeleteProduct } = vi.hoisted(() => ({
  mockSaveProduct: vi.fn(),
  mockDeleteProduct: vi.fn(),
}));
vi.mock("@/lib/data/products", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/products")>();
  return {
    ...actual,
    saveProduct: mockSaveProduct,
    deleteProduct: mockDeleteProduct,
  };
});

const adminSession = { userId: "admin-1", email: "admin@example.com", role: "admin" as const, fullName: "Ada Min" };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireCapability.mockResolvedValue(adminSession);
  mockRedirect.mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  });
});

describe("saveProductAction gates status transitions via requirePublishCapabilityForStatusChange", () => {
  it("checks the transition using the existing row's pre-save status, and proceeds when it resolves", async () => {
    mockGetEntityRow.mockResolvedValue({ id: "p1", status: "draft" });
    mockRequirePublish.mockResolvedValue(undefined);
    mockSaveProduct.mockResolvedValue("p1");

    const result = await saveProductAction("p1", { name: "Widget", status: "published" });

    expect(mockGetEntityRow).toHaveBeenCalledWith("products", "p1");
    expect(mockRequirePublish).toHaveBeenCalledWith("draft", "published");
    expect(mockSaveProduct).toHaveBeenCalled();
    expect(result).toEqual({ status: "success", id: "p1" });
  });

  it("never attempts the write when requirePublishCapabilityForStatusChange rejects (editor trying to publish)", async () => {
    mockGetEntityRow.mockResolvedValue({ id: "p1", status: "draft" });
    mockRequirePublish.mockRejectedValue(new Error("REDIRECT:/admin?error=not-authorized"));

    await expect(saveProductAction("p1", { name: "Widget", status: "published" })).rejects.toThrow(
      "REDIRECT:/admin?error=not-authorized",
    );
    expect(mockSaveProduct).not.toHaveBeenCalled();
  });

  it("still gates a save that edits an already-published row's other fields (no-op inside the guard, but still checked)", async () => {
    mockGetEntityRow.mockResolvedValue({ id: "p1", status: "published" });
    mockRequirePublish.mockResolvedValue(undefined);
    mockSaveProduct.mockResolvedValue("p1");

    await saveProductAction("p1", { name: "Renamed Widget", status: "published" });

    expect(mockRequirePublish).toHaveBeenCalledWith("published", "published");
    expect(mockSaveProduct).toHaveBeenCalled();
  });

  it("passes null as the current status for a brand-new product (no pre-existing row to read)", async () => {
    mockSaveProduct.mockResolvedValue("new-id");
    mockListEntityRows.mockResolvedValue([]);
    mockRequirePublish.mockResolvedValue(undefined);

    const result = await saveProductAction(null, { name: "Widget", status: "draft" });

    expect(mockGetEntityRow).not.toHaveBeenCalled();
    expect(mockRequirePublish).toHaveBeenCalledWith(null, "draft");
    expect(result).toEqual({ status: "success", id: "new-id" });
  });

  it("rejects an editor session creating a brand-new product directly as published", async () => {
    mockRequirePublish.mockRejectedValue(new Error("REDIRECT:/admin?error=not-authorized"));

    await expect(saveProductAction(null, { name: "Widget", status: "published" })).rejects.toThrow(
      "REDIRECT:/admin?error=not-authorized",
    );
    expect(mockSaveProduct).not.toHaveBeenCalled();
  });

  it("calls saveProduct with the product id (null for create) and all 5 child arrays, in the atomic RPC's shape", async () => {
    mockRequirePublish.mockResolvedValue(undefined);
    mockSaveProduct.mockResolvedValue("p1");
    mockGetEntityRow.mockResolvedValue({ id: "p1", status: "draft" });

    await saveProductAction("p1", {
      name: "Widget",
      status: "draft",
      benefits: [{ title: "Fast" }],
      stages: [{ title: "Stage 1" }],
      specs: [{ label: "Weight", value: "10kg" }],
      industries: ["ind-1"],
      applications: ["app-1"],
    });

    expect(mockSaveProduct).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ name: "Widget", status: "draft" }),
      [{ title: "Fast" }],
      [{ title: "Stage 1" }],
      [{ label: "Weight", value: "10kg" }],
      ["ind-1"],
      ["app-1"],
    );
  });
});

describe("deleteProductAction", () => {
  it("requires delete_content and calls deleteProduct (the atomic RPC wrapper) before redirecting", async () => {
    mockDeleteProduct.mockResolvedValue(undefined);

    await expect(deleteProductAction("p1")).rejects.toThrow("REDIRECT:/admin/products");

    expect(mockRequireCapability).toHaveBeenCalledWith("delete_content");
    expect(mockDeleteProduct).toHaveBeenCalledWith("p1");
  });
});
