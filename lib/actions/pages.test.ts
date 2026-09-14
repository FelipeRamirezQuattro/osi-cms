import { describe, expect, it, vi, beforeEach, test } from "vitest";
import { publishPageAction, unpublishPageAction, deletePageAction } from "@/lib/actions/pages";
import { inviteUserAction, setUserRoleAction, setUserActiveAction } from "@/lib/actions/users";

/**
 * These exercise the real lib/actions/pages.ts / lib/actions/users.ts
 * Server Action functions against mocked @/lib/auth, @/lib/data/pages and
 * @/lib/data/admin-users, per the controller ruling in the Task 1 brief:
 * no live DB, no browser — just the actions' own authorization/propagation
 * logic.
 *
 * vi.hoisted is required here (not plain outer-scope consts) because
 * vi.mock factories are hoisted above imports by Vitest's transform —
 * referencing a non-hoisted const would throw "Cannot access before
 * initialization".
 */
const { mockRequireAdmin, mockRequireAdminRole, mockRequireCapability } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockRequireAdminRole: vi.fn(),
  mockRequireCapability: vi.fn(),
}));
// Not spread from the actual module (unlike the @/lib/data/pages mock
// below): lib/auth/index.ts's real requireCapability calls the module's
// *own* requireAdmin internally — a same-module function reference that
// overriding the mocked *export* wouldn't intercept — so spreading
// `...actual` here would silently let a real, uncontrolled
// createServerDbClient()/cookies() session lookup leak into this test the
// moment Task 4 wires requireCapability in. Mocking requireCapability
// directly as its own controllable export sidesteps that, and covers the
// other plausible shape Task 4 might take too (requireAdmin() + an inline
// hasCapability() check + a bare redirect()) via the existing mockRedirect.
vi.mock("@/lib/auth", () => ({
  requireAdmin: mockRequireAdmin,
  requireAdminRole: mockRequireAdminRole,
  requireCapability: mockRequireCapability,
}));

const { mockPublishPage, mockUnpublishPage, mockDeletePage } = vi.hoisted(() => ({
  mockPublishPage: vi.fn(),
  mockUnpublishPage: vi.fn(),
  mockDeletePage: vi.fn(),
}));
vi.mock("@/lib/data/pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/pages")>();
  return {
    ...actual,
    publishPage: mockPublishPage,
    unpublishPage: mockUnpublishPage,
    deletePage: mockDeletePage,
  };
});

const { mockRedirect } = vi.hoisted(() => ({ mockRedirect: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

const { mockInviteAdminUser, mockUpdateAdminUserRow } = vi.hoisted(() => ({
  mockInviteAdminUser: vi.fn(),
  mockUpdateAdminUserRow: vi.fn(),
}));
vi.mock("@/lib/data/admin-users", () => ({
  listAdminUsers: vi.fn(),
  inviteAdminUser: mockInviteAdminUser,
  updateAdminUserRow: mockUpdateAdminUserRow,
}));

const editorSession = { userId: "editor-1", email: "editor@example.com", role: "editor" as const, fullName: "Edie Tor" };
const adminSession = { userId: "admin-1", email: "admin@example.com", role: "admin" as const, fullName: "Ada Min" };

beforeEach(() => {
  vi.clearAllMocks();
  mockRedirect.mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  });
});

describe("publish/unpublish role enforcement (known defect — Task 4 territory)", () => {
  // requireAdmin() only checks "is this an active staff session" — it does
  // not check role or capability, so today an editor session sails through
  // exactly like an admin session would. lib/auth/capabilities.ts already
  // models "publish" as admin-only, but lib/actions/pages.ts hasn't been
  // wired to call requireCapability("publish") yet (that's Task 4).
  //
  // test.fails() documents "this is broken today, for this exact reason"
  // without turning the suite red — but only if the wrapped assertion is
  // written so it actually throws today (a resolved promise where a
  // rejection was expected) rather than merely evaluating false: once
  // Task 4 wires requireCapability("publish") in, that call redirects
  // (lib/auth/index.ts's real requireCapability calls redirect(...) on
  // failure, which this file's mocked next/navigation.redirect throws
  // for), so `await publishPageAction(...)` itself would throw *before* a
  // bare `expect(...).not.toHaveBeenCalled()` on the next line ever ran —
  // a synchronous assertion after an unawaited throw point would still
  // read as "test failed" today for the WRONG reason (nothing throws yet)
  // and would keep reading as "test failed" after the fix too (something
  // throws, uncaught, same test-level failure) — test.fails() can't tell
  // those apart and would silently stay green forever. Wrapping the call
  // itself in `.rejects.toThrow()` fixes that: today the promise resolves
  // successfully, so `.rejects` itself fails (the real defect); once
  // Task 4 lands, the promise rejects as expected, `.rejects.toThrow()`
  // passes, the mutation was never called, the test body completes
  // without throwing, and test.fails() correctly flips to a hard failure
  // — the intended signal to remove the annotation.

  beforeEach(() => {
    mockRequireAdmin.mockResolvedValue(editorSession);
    mockRequireCapability.mockImplementation(() => {
      throw new Error("REDIRECT:/admin?error=not-authorized");
    });
    mockPublishPage.mockResolvedValue(undefined);
    mockUnpublishPage.mockResolvedValue(undefined);
  });

  // TODO(Task 4): remove test.fails() once publishPageAction rejects an
  // editor session (via requireCapability("publish") or an equivalent
  // inline check) instead of letting it through bare requireAdmin().
  test.fails("an editor session cannot publish a page", async () => {
    await expect(publishPageAction("page-1", 1)).rejects.toThrow();
    expect(mockPublishPage).not.toHaveBeenCalled();
  });

  // TODO(Task 4): remove test.fails() once unpublishPageAction rejects an
  // editor session (via requireCapability("publish") or an equivalent
  // inline check) instead of letting it through bare requireAdmin().
  test.fails("an editor session cannot unpublish a page", async () => {
    await expect(unpublishPageAction("page-1")).rejects.toThrow();
    expect(mockUnpublishPage).not.toHaveBeenCalled();
  });
});

describe("user-management actions already gate on role (requireAdminRole, not the capability model)", () => {
  // Unlike publish/unpublish, lib/actions/users.ts's mutations already
  // call requireAdminRole() (role === "admin" only) rather than bare
  // requireAdmin() — so an editor session is already rejected here, even
  // though it's not yet expressed through the new hasCapability("manage_users")
  // model either. These are ordinary passing regression tests (ruling #1
  // shape), not test.fails() cases — there's no live defect to capture.

  it("rejects an editor session before inviting a user", async () => {
    mockRequireAdminRole.mockImplementation(() => {
      throw new Error("REDIRECT:/admin");
    });

    await expect(inviteUserAction("new@example.com", "editor")).rejects.toThrow("REDIRECT:/admin");
    expect(mockInviteAdminUser).not.toHaveBeenCalled();
  });

  it("rejects an editor session before changing a user's role", async () => {
    mockRequireAdminRole.mockImplementation(() => {
      throw new Error("REDIRECT:/admin");
    });

    await expect(setUserRoleAction("user-1", "admin")).rejects.toThrow("REDIRECT:/admin");
    expect(mockUpdateAdminUserRow).not.toHaveBeenCalled();
  });

  it("allows an admin session to invite a user", async () => {
    mockRequireAdminRole.mockResolvedValue(adminSession);
    mockInviteAdminUser.mockResolvedValue(undefined);

    const result = await inviteUserAction("new@example.com", "editor");
    expect(result).toEqual({ status: "success" });
    expect(mockInviteAdminUser).toHaveBeenCalledWith("new@example.com", "editor", undefined);
  });

  it("allows an admin session to activate/deactivate a user", async () => {
    mockRequireAdminRole.mockResolvedValue(adminSession);
    mockUpdateAdminUserRow.mockResolvedValue(undefined);

    await setUserActiveAction("user-1", false);
    expect(mockUpdateAdminUserRow).toHaveBeenCalledWith("user-1", { is_active: false });
  });
});

describe("deletePageAction propagates system-page delete protection (regression — already fixed)", () => {
  // delete_page_atomic (supabase/migrations/0017_publishing_permissions_atomic.sql)
  // raises when p_page_id refers to a page with is_system = true. This
  // asserts the Server Action layer propagates that rejection rather than
  // swallowing it or redirecting to /admin/pages as if the delete had
  // succeeded.

  beforeEach(() => {
    mockRequireAdmin.mockResolvedValue(adminSession);
  });

  it("propagates the rejection and never redirects when deletePage rejects", async () => {
    mockDeletePage.mockRejectedValue(new Error("System pages cannot be deleted"));

    await expect(deletePageAction("system-page-id")).rejects.toThrow("System pages cannot be deleted");
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it("redirects to /admin/pages only once the delete actually succeeds", async () => {
    mockDeletePage.mockResolvedValue(undefined);

    await expect(deletePageAction("ordinary-page-id")).rejects.toThrow("REDIRECT:/admin/pages");
    expect(mockDeletePage).toHaveBeenCalledWith("ordinary-page-id");
    expect(mockRedirect).toHaveBeenCalledWith("/admin/pages");
  });
});
