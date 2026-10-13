import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockUnpublish } = vi.hoisted(() => ({ mockUnpublish: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireCapability: vi.fn(async () => ({})) }));
vi.mock("@/lib/data/shared-sections", () => ({
  unpublishSharedSection: mockUnpublish,
  publishSharedSection: vi.fn(),
  saveSharedSectionDraft: vi.fn(),
  createSharedSection: vi.fn(),
  deleteSharedSection: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), updateTag: vi.fn(), revalidateTag: vi.fn() }));

import { unpublishSharedSectionAction } from "@/lib/actions/shared-sections";

beforeEach(() => {
  mockUnpublish.mockReset();
});

describe("unpublishSharedSectionAction (COM-05)", () => {
  it("returns the new status so the editor badge follows the server after one click", async () => {
    mockUnpublish.mockResolvedValue(undefined);
    expect(await unpublishSharedSectionAction("s1")).toEqual({ status: "success", newStatus: "draft" });
  });

  it("reports a failure instead of throwing", async () => {
    mockUnpublish.mockRejectedValue(new Error("boom"));
    expect(await unpublishSharedSectionAction("s1")).toMatchObject({ status: "error" });
  });
});
