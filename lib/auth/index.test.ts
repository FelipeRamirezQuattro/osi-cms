import { describe, expect, it, vi, beforeEach } from "vitest";
import { requirePublishCapabilityForStatusChange } from "@/lib/auth";

/**
 * Task 4 review finding: an editor could flip a product/entity's
 * `status` to (or from) "published" through the ordinary save form,
 * since saveProductAction/saveEntityAction only required `edit_drafts`.
 * requirePublishCapabilityForStatusChange is the fix — a no-op unless
 * the transition actually crosses into/out of "published", in which
 * case it requires the real `publish` capability.
 *
 * This exercises the REAL requireAdmin -> requireCapability ->
 * hasCapability chain (only lib/db/client and next/navigation's
 * redirect are mocked), rather than mocking requireCapability itself —
 * lib/actions/pages.test.ts's file-level comment explains why mocking
 * requireCapability directly is necessary *there* (it mocks the whole
 * "@/lib/auth" barrel to control other actions' sessions); here there's
 * nothing else in "@/lib/auth" under test, so driving the real chain via
 * a fake DB client gives closer-to-real coverage of this one function.
 */
const { mockCreateServerDbClient } = vi.hoisted(() => ({ mockCreateServerDbClient: vi.fn() }));
vi.mock("@/lib/db/client", () => ({
  createServerDbClient: mockCreateServerDbClient,
}));

const { mockRedirect } = vi.hoisted(() => ({ mockRedirect: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

function fakeSessionClient(role: "admin" | "editor") {
  return {
    auth: {
      getUser: async () => ({ data: { user: { id: "user-1", email: "user@example.com" } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { role, full_name: "Test User", is_active: true } }),
        }),
      }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRedirect.mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  });
});

describe("requirePublishCapabilityForStatusChange", () => {
  it("is a no-op when status doesn't change (draft -> draft)", async () => {
    mockCreateServerDbClient.mockReturnValue(fakeSessionClient("editor"));
    await expect(requirePublishCapabilityForStatusChange("draft", "draft")).resolves.toBeUndefined();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("is a no-op when status doesn't change (published -> published, editing a live row's other fields)", async () => {
    mockCreateServerDbClient.mockReturnValue(fakeSessionClient("editor"));
    await expect(requirePublishCapabilityForStatusChange("published", "published")).resolves.toBeUndefined();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("rejects an editor session transitioning draft -> published", async () => {
    mockCreateServerDbClient.mockReturnValue(fakeSessionClient("editor"));
    await expect(requirePublishCapabilityForStatusChange("draft", "published")).rejects.toThrow(
      "REDIRECT:/admin?error=not-authorized",
    );
  });

  it("rejects an editor session transitioning published -> draft (unpublishing via the save form)", async () => {
    mockCreateServerDbClient.mockReturnValue(fakeSessionClient("editor"));
    await expect(requirePublishCapabilityForStatusChange("published", "draft")).rejects.toThrow(
      "REDIRECT:/admin?error=not-authorized",
    );
  });

  it("rejects an editor session creating a brand-new row directly as published", async () => {
    mockCreateServerDbClient.mockReturnValue(fakeSessionClient("editor"));
    await expect(requirePublishCapabilityForStatusChange(null, "published")).rejects.toThrow(
      "REDIRECT:/admin?error=not-authorized",
    );
  });

  it("allows an editor session to create a brand-new draft row", async () => {
    mockCreateServerDbClient.mockReturnValue(fakeSessionClient("editor"));
    await expect(requirePublishCapabilityForStatusChange(null, "draft")).resolves.toBeUndefined();
  });

  it("allows an admin session to transition draft -> published", async () => {
    mockCreateServerDbClient.mockReturnValue(fakeSessionClient("admin"));
    await expect(requirePublishCapabilityForStatusChange("draft", "published")).resolves.toBeUndefined();
  });

  it("allows an admin session to transition published -> draft", async () => {
    mockCreateServerDbClient.mockReturnValue(fakeSessionClient("admin"));
    await expect(requirePublishCapabilityForStatusChange("published", "draft")).resolves.toBeUndefined();
  });
});
