import { describe, expect, it, vi, beforeEach } from "vitest";
import { deleteEntityAction, restoreEntityAction, saveEntityAction } from "@/lib/actions/entities";

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

const { mockGetEntityRow, mockUpdateEntityRow, mockInsertEntityRow, mockListEntityRows, mockDeleteEntityRow } =
  vi.hoisted(() => ({
    mockGetEntityRow: vi.fn(),
    mockUpdateEntityRow: vi.fn(),
    mockInsertEntityRow: vi.fn(),
    mockListEntityRows: vi.fn(),
    mockDeleteEntityRow: vi.fn(),
  }));
vi.mock("@/lib/data/admin-entities", () => ({
  getEntityRow: mockGetEntityRow,
  updateEntityRow: mockUpdateEntityRow,
  insertEntityRow: mockInsertEntityRow,
  listEntityRows: mockListEntityRows,
  deleteEntityRow: mockDeleteEntityRow,
  moveEntityRow: vi.fn(),
  listRelationOptions: vi.fn(),
}));

const { mockCountProductsByCategory } = vi.hoisted(() => ({ mockCountProductsByCategory: vi.fn() }));
vi.mock("@/lib/data/products", () => ({ countProductsByCategory: mockCountProductsByCategory }));

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error(`NEXT_REDIRECT:${url}`), { digest: `NEXT_REDIRECT;${url}` });
  }),
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

/**
 * Task 8 item #1: product-categories deletes must be rejected with a
 * clear message when any product still references the category —
 * category_id is nullable with `on delete set null` at the DB level
 * (migration 0003), which would otherwise silently orphan a product's
 * canonical URL (productHref needs a category slug) instead of stopping
 * the delete.
 */
describe("deleteEntityAction", () => {
  it("rejects deleting a product category that still has products, without touching the row", async () => {
    mockCountProductsByCategory.mockResolvedValue(3);

    const result = await deleteEntityAction("product-categories", "cat-1");

    expect(mockCountProductsByCategory).toHaveBeenCalledWith("cat-1");
    expect(mockDeleteEntityRow).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "error", message: "Can't delete — 3 products use this category." });
  });

  it("uses singular phrasing for exactly one referencing product", async () => {
    mockCountProductsByCategory.mockResolvedValue(1);

    const result = await deleteEntityAction("product-categories", "cat-1");

    expect(result).toEqual({ status: "error", message: "Can't delete — 1 product uses this category." });
  });

  it("allows deleting a product category with no referencing products, then redirects", async () => {
    mockCountProductsByCategory.mockResolvedValue(0);
    mockDeleteEntityRow.mockResolvedValue(undefined);

    await expect(deleteEntityAction("product-categories", "cat-1")).rejects.toThrow(/NEXT_REDIRECT/);

    expect(mockDeleteEntityRow).toHaveBeenCalledWith("product_categories", "cat-1");
  });

  it("never runs the category guard for other entity types", async () => {
    mockDeleteEntityRow.mockResolvedValue(undefined);

    await expect(deleteEntityAction("industries", "ind-1")).rejects.toThrow(/NEXT_REDIRECT/);

    expect(mockCountProductsByCategory).not.toHaveBeenCalled();
    expect(mockDeleteEntityRow).toHaveBeenCalledWith("industries", "ind-1");
  });

  it("surfaces a delete failure as an error result instead of throwing", async () => {
    mockCountProductsByCategory.mockResolvedValue(0);
    mockDeleteEntityRow.mockRejectedValue(new Error("db exploded"));

    const result = await deleteEntityAction("product-categories", "cat-1");

    expect(result).toEqual({ status: "error", message: "db exploded" });
  });
});

/**
 * Task 15 review finding fix: restoreEntityAction must refuse to run on
 * anything but an already-'archived' row. Without this guard, calling it
 * directly on a published row (a Server Action is a network endpoint,
 * not just the button that happens to be hidden for non-archived rows in
 * the UI) would flip status to 'draft' with only edit_drafts, un-
 * publishing it without the `publish` capability that transition
 * normally requires.
 */
describe("restoreEntityAction", () => {
  it("refuses to restore a row that isn't archived, without writing anything", async () => {
    mockGetEntityRow.mockResolvedValue({ id: "n1", status: "published" });

    const result = await restoreEntityAction("news", "n1");

    expect(result).toEqual({ status: "error", message: "News or blog post is not archived." });
    expect(mockUpdateEntityRow).not.toHaveBeenCalled();
  });

  it("restores an archived row to draft", async () => {
    mockGetEntityRow.mockResolvedValue({ id: "n1", status: "archived" });
    mockUpdateEntityRow.mockResolvedValue({ id: "n1" });

    const result = await restoreEntityAction("news", "n1");

    expect(mockUpdateEntityRow).toHaveBeenCalledWith("news_posts", "n1", { status: "draft" });
    expect(result).toEqual({ status: "success" });
  });

  it("rejects an entity type that doesn't allow archiving, before even checking status", async () => {
    const result = await restoreEntityAction("industries", "ind-1");

    expect(result).toEqual({ status: "error", message: "Industry can't be restored." });
    expect(mockGetEntityRow).not.toHaveBeenCalled();
  });
});
