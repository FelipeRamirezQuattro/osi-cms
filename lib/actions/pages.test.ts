import { describe, expect, it, vi, beforeEach } from "vitest";
import { createPageAction, publishPageAction, unpublishPageAction, deletePageAction } from "@/lib/actions/pages";
import { inviteUserAction, setUserRoleAction, setUserActiveAction } from "@/lib/actions/users";
import { createNavItemAction } from "@/lib/actions/navigation";
import { saveSettingsAction } from "@/lib/actions/settings";
import { hasCapability, type Capability } from "@/lib/auth/capabilities";

/**
 * These exercise the real lib/actions/pages.ts, lib/actions/users.ts,
 * lib/actions/navigation.ts and lib/actions/settings.ts Server Action
 * functions against mocked @/lib/auth and each file's own lib/data/*
 * module, per the controller ruling in the Task 1 brief: no live DB, no
 * browser — just the actions' own authorization/propagation logic.
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
// Not spread from the actual module: every action under test here
// (pages/users/navigation/settings) is wired to lib/auth/index.ts's real
// requireCapability, which internally calls the module's *own*
// requireAdmin — a same-module function reference that overriding the
// mocked *export* wouldn't intercept — so spreading `...actual` here
// would silently let a real, uncontrolled createServerDbClient()/
// cookies() session lookup leak into this test. Mocking requireCapability
// directly as its own controllable export sidesteps that.
vi.mock("@/lib/auth", () => ({
  requireAdmin: mockRequireAdmin,
  requireAdminRole: mockRequireAdminRole,
  requireCapability: mockRequireCapability,
}));

const { mockPublishPage, mockUnpublishPage, mockDeletePage, mockCreatePage, mockSavePageDraft } = vi.hoisted(() => ({
  mockPublishPage: vi.fn(),
  mockUnpublishPage: vi.fn(),
  mockDeletePage: vi.fn(),
  mockCreatePage: vi.fn(),
  mockSavePageDraft: vi.fn(),
}));
vi.mock("@/lib/data/pages", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/data/pages")>();
  return {
    ...actual,
    publishPage: mockPublishPage,
    unpublishPage: mockUnpublishPage,
    deletePage: mockDeletePage,
    createPage: mockCreatePage,
    savePageDraft: mockSavePageDraft,
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

const { mockCreateNavItem } = vi.hoisted(() => ({ mockCreateNavItem: vi.fn() }));
vi.mock("@/lib/data/navigation", () => ({
  createNavItem: mockCreateNavItem,
  deleteNavItem: vi.fn(),
  getOrCreateNavMenu: vi.fn(),
  listNavItemsAdmin: vi.fn(),
  listNavMenusAdmin: vi.fn(),
  moveNavItem: vi.fn(),
  updateNavItem: vi.fn(),
}));

const { mockUpdateSiteSettings } = vi.hoisted(() => ({ mockUpdateSiteSettings: vi.fn() }));
vi.mock("@/lib/data/settings", () => ({
  getSiteSettings: vi.fn(),
  updateSiteSettings: mockUpdateSiteSettings,
}));

const editorSession = { userId: "editor-1", email: "editor@example.com", role: "editor" as const, fullName: "Edie Tor" };
const adminSession = { userId: "admin-1", email: "admin@example.com", role: "admin" as const, fullName: "Ada Min" };

/**
 * A role-driven mock for requireCapability that exercises the REAL
 * hasCapability() function against a given session, instead of always
 * unconditionally accepting or rejecting. This is what makes these
 * tests able to catch a capability *mis-mapping* (e.g. publishPageAction
 * accidentally wired to requireCapability("edit_drafts") instead of
 * "publish"): an "editor cannot X" test built on requireCapabilityAs
 * (editorSession) only rejects if the capability the action under test
 * actually asked for is one hasCapability("editor", ...) says no to —
 * an unconditional "always throw" mock would pass that same test
 * whether the action asked for the *right* capability or not. Mirrors
 * the real requireCapability's failure mode (redirect() throws) for the
 * rejection case.
 */
function requireCapabilityAs(session: typeof editorSession | typeof adminSession) {
  return async (capability: Capability) => {
    if (!hasCapability(session.role, capability)) {
      throw new Error("REDIRECT:/admin?error=not-authorized");
    }
    return session;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRedirect.mockImplementation((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  });
});

describe("publish/unpublish require the publish capability", () => {
  // lib/auth/capabilities.ts models "publish" as admin-only.
  // lib/actions/pages.ts's publishPageAction/unpublishPageAction call
  // requireCapability("publish") — an editor session must be rejected
  // before the underlying mutation ever runs.

  it("rejects an editor session before publishing", async () => {
    mockRequireCapability.mockImplementation(requireCapabilityAs(editorSession));
    mockPublishPage.mockResolvedValue(undefined);

    await expect(publishPageAction("page-1", 1)).rejects.toThrow("REDIRECT:/admin?error=not-authorized");
    expect(mockPublishPage).not.toHaveBeenCalled();
  });

  it("rejects an editor session before unpublishing", async () => {
    mockRequireCapability.mockImplementation(requireCapabilityAs(editorSession));
    mockUnpublishPage.mockResolvedValue(undefined);

    await expect(unpublishPageAction("page-1")).rejects.toThrow("REDIRECT:/admin?error=not-authorized");
    expect(mockUnpublishPage).not.toHaveBeenCalled();
  });

  it("allows an admin session to publish", async () => {
    mockRequireCapability.mockImplementation(requireCapabilityAs(adminSession));
    mockPublishPage.mockResolvedValue(undefined);

    const result = await publishPageAction("page-1", 1);
    expect(result).toEqual({ status: "success", newVersion: 1 });
    // Task 15: publishPageAction now always threads a createRedirect
    // flag through to publishPage (defaulting to false when the caller,
    // like the pre-existing publish flow being tested here, doesn't pass one).
    expect(mockPublishPage).toHaveBeenCalledWith("page-1", 1, { createRedirect: false });
  });
});

describe("navigation mutations require the manage_navigation capability", () => {
  const input = { menu_id: "menu-1", parent_id: null, label: "Products", href: "/products", is_external: false };

  it("rejects an editor session before creating a nav item", async () => {
    mockRequireCapability.mockImplementation(requireCapabilityAs(editorSession));

    await expect(createNavItemAction(input)).rejects.toThrow("REDIRECT:/admin?error=not-authorized");
    expect(mockCreateNavItem).not.toHaveBeenCalled();
  });

  it("allows an admin session to create a nav item", async () => {
    mockRequireCapability.mockImplementation(requireCapabilityAs(adminSession));
    mockCreateNavItem.mockResolvedValue(undefined);

    await createNavItemAction(input);
    // navItemCreateSchema (lib/validation/navigation.ts) normalizes the
    // absent optional `badge` to `null` rather than leaving it undefined.
    expect(mockCreateNavItem).toHaveBeenCalledWith({ ...input, badge: null });
  });
});

describe("settings mutations require the manage_settings capability", () => {
  it("rejects an editor session before saving settings", async () => {
    mockRequireCapability.mockImplementation(requireCapabilityAs(editorSession));

    await expect(saveSettingsAction({ phone: "555-1234", address_lines: [] })).rejects.toThrow(
      "REDIRECT:/admin?error=not-authorized",
    );
    expect(mockUpdateSiteSettings).not.toHaveBeenCalled();
  });

  it("allows an admin session to save settings", async () => {
    mockRequireCapability.mockImplementation(requireCapabilityAs(adminSession));
    mockUpdateSiteSettings.mockResolvedValue(undefined);

    const result = await saveSettingsAction({ phone: "555-1234", address_lines: ["", "1 Main St"] });
    expect(result).toEqual({ status: "success" });
    expect(mockUpdateSiteSettings).toHaveBeenCalledWith(expect.objectContaining({ address_lines: ["1 Main St"] }));
  });
});

describe("user-management actions require the manage_users capability", () => {
  // lib/actions/users.ts was remapped from requireAdminRole() onto
  // requireCapability("manage_users") for consistency with every other
  // action (same effective behavior: admin-only, since manage_users is
  // absent from EDITOR_CAPABILITIES).

  it("rejects an editor session before inviting a user", async () => {
    mockRequireCapability.mockImplementation(requireCapabilityAs(editorSession));

    await expect(inviteUserAction("new@example.com", "editor")).rejects.toThrow(
      "REDIRECT:/admin?error=not-authorized",
    );
    expect(mockInviteAdminUser).not.toHaveBeenCalled();
  });

  it("rejects an editor session before changing a user's role", async () => {
    mockRequireCapability.mockImplementation(requireCapabilityAs(editorSession));

    await expect(setUserRoleAction("user-1", "admin")).rejects.toThrow("REDIRECT:/admin?error=not-authorized");
    expect(mockUpdateAdminUserRow).not.toHaveBeenCalled();
  });

  it("rejects an editor session before activating/deactivating a user", async () => {
    mockRequireCapability.mockImplementation(requireCapabilityAs(editorSession));

    await expect(setUserActiveAction("user-1", false)).rejects.toThrow("REDIRECT:/admin?error=not-authorized");
    expect(mockUpdateAdminUserRow).not.toHaveBeenCalled();
  });

  it("allows an admin session to invite a user", async () => {
    mockRequireCapability.mockImplementation(requireCapabilityAs(adminSession));
    mockInviteAdminUser.mockResolvedValue(undefined);

    const result = await inviteUserAction("new@example.com", "editor");
    expect(result).toEqual({ status: "success" });
    expect(mockInviteAdminUser).toHaveBeenCalledWith("new@example.com", "editor", undefined);
  });

  it("allows an admin session to activate/deactivate a user", async () => {
    mockRequireCapability.mockImplementation(requireCapabilityAs(adminSession));
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
    mockRequireCapability.mockImplementation(requireCapabilityAs(adminSession));
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

  it("rejects an editor session before a delete is even attempted", async () => {
    mockRequireCapability.mockImplementation(requireCapabilityAs(editorSession));

    await expect(deletePageAction("page-1")).rejects.toThrow("REDIRECT:/admin?error=not-authorized");
    expect(mockDeletePage).not.toHaveBeenCalled();
  });
});

describe("createPageAction seeds starter blocks from the chosen template (Task 7 item #8)", () => {
  // template is a one-time creation preset (lib/validation/pages.ts) —
  // this is the only place it has any effect. STARTER_BLOCK_TYPES in
  // lib/actions/pages.ts maps each template to real block registry
  // types, so this also incidentally guards against a typo'd type that
  // getBlockPalette() wouldn't recognize.

  beforeEach(() => {
    mockRequireCapability.mockImplementation(requireCapabilityAs(editorSession));
    mockCreatePage.mockResolvedValue({ id: "page-1", draft_version: 1 });
    mockSavePageDraft.mockResolvedValue(2);
  });

  it("seeds no blocks for the 'standard' template", async () => {
    const result = await createPageAction({
      title: "Plain page",
      slug: "plain-page",
      locale: "en",
      template: "standard",
      seo_title: null,
      seo_description: null,
      og_image_url: null,
      noindex: false,
    });

    expect(result).toEqual({ id: "page-1" });
    expect(mockSavePageDraft).not.toHaveBeenCalled();
  });

  it("seeds a hero_full + cta_band draft for the 'landing' template", async () => {
    await createPageAction({
      title: "Landing",
      slug: "landing-page",
      locale: "en",
      template: "landing",
      seo_title: null,
      seo_description: null,
      og_image_url: null,
      noindex: false,
    });

    expect(mockSavePageDraft).toHaveBeenCalledTimes(1);
    const [pageId, , blocks, expectedVersion] = mockSavePageDraft.mock.calls[0];
    expect(pageId).toBe("page-1");
    expect(expectedVersion).toBe(1);
    expect(blocks.map((b: { type: string }) => b.type)).toEqual(["hero_full", "cta_band"]);
    expect(blocks.every((b: { is_visible: boolean }) => b.is_visible)).toBe(true);
  });

  it("seeds a single rich_text block for the 'legal' template", async () => {
    await createPageAction({
      title: "Terms",
      slug: "terms",
      locale: "en",
      template: "legal",
      seo_title: null,
      seo_description: null,
      og_image_url: null,
      noindex: false,
    });

    const blocks = mockSavePageDraft.mock.calls[0][2];
    expect(blocks.map((b: { type: string }) => b.type)).toEqual(["rich_text"]);
  });

  it("seeds a single contact_form block for the 'contact' template", async () => {
    await createPageAction({
      title: "Contact",
      slug: "contact-us",
      locale: "en",
      template: "contact",
      seo_title: null,
      seo_description: null,
      og_image_url: null,
      noindex: false,
    });

    const blocks = mockSavePageDraft.mock.calls[0][2];
    expect(blocks.map((b: { type: string }) => b.type)).toEqual(["contact_form"]);
  });

  it("still returns the created page's id when seeding starter blocks fails (page already exists — not a creation failure)", async () => {
    // Regression: seeding used to sit inside the same try/catch as
    // createPage, so a savePageDraft failure here surfaced as this
    // function's generic "slug already in use" creation error — wrong,
    // since the page row was already committed above.
    mockSavePageDraft.mockRejectedValue(new Error("version conflict"));

    const result = await createPageAction({
      title: "Landing",
      slug: "landing-page",
      locale: "en",
      template: "landing",
      seo_title: null,
      seo_description: null,
      og_image_url: null,
      noindex: false,
    });

    expect(result).toEqual({ id: "page-1" });
  });
});
