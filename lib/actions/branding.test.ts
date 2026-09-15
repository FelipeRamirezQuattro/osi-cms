import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getBrandingDraftAction,
  getPublishedBrandingAction,
  listBrandingRevisionsAction,
  publishBrandingAction,
  resetBrandingDraftToPublishedAction,
  restoreBrandingRevisionToDraftAction,
  saveBrandingDraftAction,
} from "@/lib/actions/branding";
import { hasCapability, type Capability } from "@/lib/auth/capabilities";
import { OSI_SEED_BRANDING_CONFIG } from "@/lib/branding/seed";

/**
 * Exercises the real lib/actions/branding.ts Server Actions against a
 * mocked @/lib/auth and lib/data/branding.ts, mirroring lib/actions/
 * pages.test.ts's pattern exactly (including its `requireCapabilityAs`
 * helper, which drives the REAL hasCapability() so these tests catch a
 * capability *mis-mapping*, not just "some string was passed").
 *
 * `manage_settings` is admin-only (lib/auth/capabilities.ts) — every
 * action here must reject an editor session and allow an admin one.
 */
const { mockRequireAdmin, mockRequireCapability } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockRequireCapability: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  requireAdmin: mockRequireAdmin,
  requireCapability: mockRequireCapability,
}));

const {
  mockGetBrandingDraft,
  mockGetPublishedBranding,
  mockListBrandingRevisions,
  mockSaveBrandingDraft,
  mockPublishBranding,
  mockRestoreBrandingRevisionToDraft,
  mockResetBrandingDraftToPublished,
} = vi.hoisted(() => ({
  mockGetBrandingDraft: vi.fn(),
  mockGetPublishedBranding: vi.fn(),
  mockListBrandingRevisions: vi.fn(),
  mockSaveBrandingDraft: vi.fn(),
  mockPublishBranding: vi.fn(),
  mockRestoreBrandingRevisionToDraft: vi.fn(),
  mockResetBrandingDraftToPublished: vi.fn(),
}));
vi.mock("@/lib/data/branding", () => ({
  getBrandingDraft: mockGetBrandingDraft,
  getPublishedBranding: mockGetPublishedBranding,
  listBrandingRevisions: mockListBrandingRevisions,
  saveBrandingDraft: mockSaveBrandingDraft,
  publishBranding: mockPublishBranding,
  restoreBrandingRevisionToDraft: mockRestoreBrandingRevisionToDraft,
  resetBrandingDraftToPublished: mockResetBrandingDraftToPublished,
}));

const editorSession = { userId: "editor-1", email: "editor@example.com", role: "editor" as const, fullName: "Edie Tor" };
const adminSession = { userId: "admin-1", email: "admin@example.com", role: "admin" as const, fullName: "Ada Min" };

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
});

describe("every branding action requires the manage_settings capability", () => {
  const cases: Array<{ name: string; run: () => Promise<unknown>; mock: ReturnType<typeof vi.fn> }> = [
    { name: "getBrandingDraftAction", run: () => getBrandingDraftAction(), mock: mockGetBrandingDraft },
    { name: "getPublishedBrandingAction", run: () => getPublishedBrandingAction(), mock: mockGetPublishedBranding },
    { name: "listBrandingRevisionsAction", run: () => listBrandingRevisionsAction(), mock: mockListBrandingRevisions },
    {
      name: "saveBrandingDraftAction",
      run: () => saveBrandingDraftAction(OSI_SEED_BRANDING_CONFIG, 1),
      mock: mockSaveBrandingDraft,
    },
    { name: "publishBrandingAction", run: () => publishBrandingAction(1), mock: mockPublishBranding },
    {
      name: "restoreBrandingRevisionToDraftAction",
      run: () => restoreBrandingRevisionToDraftAction("revision-1", 1),
      mock: mockRestoreBrandingRevisionToDraft,
    },
    {
      name: "resetBrandingDraftToPublishedAction",
      run: () => resetBrandingDraftToPublishedAction(1),
      mock: mockResetBrandingDraftToPublished,
    },
  ];

  for (const { name, run, mock } of cases) {
    it(`${name} rejects an editor session before touching the repository`, async () => {
      mockRequireCapability.mockImplementation(requireCapabilityAs(editorSession));

      await expect(run()).rejects.toThrow("REDIRECT:/admin?error=not-authorized");
      expect(mock).not.toHaveBeenCalled();
    });
  }

  it("getBrandingDraftAction allows an admin session", async () => {
    mockRequireCapability.mockImplementation(requireCapabilityAs(adminSession));
    mockGetBrandingDraft.mockResolvedValue({ id: true, config: OSI_SEED_BRANDING_CONFIG });

    await getBrandingDraftAction();
    expect(mockGetBrandingDraft).toHaveBeenCalled();
  });
});

describe("saveBrandingDraftAction", () => {
  beforeEach(() => {
    mockRequireCapability.mockImplementation(requireCapabilityAs(adminSession));
  });

  it("rejects a malformed config before it ever reaches the repository", async () => {
    const invalid = { ...OSI_SEED_BRANDING_CONFIG, swatches: [] }; // dangling role references now

    const result = await saveBrandingDraftAction(invalid, 1);

    expect(result.status).toBe("error");
    expect(mockSaveBrandingDraft).not.toHaveBeenCalled();
  });

  it("saves a valid config and returns the new version", async () => {
    mockSaveBrandingDraft.mockResolvedValue(2);

    const result = await saveBrandingDraftAction(OSI_SEED_BRANDING_CONFIG, 1);

    expect(result).toEqual({ status: "success", newVersion: 2 });
    expect(mockSaveBrandingDraft).toHaveBeenCalledWith(OSI_SEED_BRANDING_CONFIG, 1);
  });

  it("surfaces a version conflict distinctly", async () => {
    const conflictError = Object.assign(new Error("Branding was changed by another administrator. Refresh before saving."), {
      code: "40001",
    });
    mockSaveBrandingDraft.mockRejectedValue(conflictError);

    const result = await saveBrandingDraftAction(OSI_SEED_BRANDING_CONFIG, 1);

    expect(result).toEqual({
      status: "error",
      message: "Branding was changed by another administrator. Refresh before saving.",
      conflict: true,
    });
  });
});

describe("publishBrandingAction", () => {
  beforeEach(() => {
    mockRequireCapability.mockImplementation(requireCapabilityAs(adminSession));
  });

  it("threads the caller's version back through on success (publish doesn't bump draft_version)", async () => {
    mockPublishBranding.mockResolvedValue(undefined);

    const result = await publishBrandingAction(7);

    expect(result).toEqual({ status: "success", newVersion: 7 });
    expect(mockPublishBranding).toHaveBeenCalledWith(7);
  });

  it("surfaces a version conflict distinctly", async () => {
    const conflictError = Object.assign(new Error("stale"), { code: "40001" });
    mockPublishBranding.mockRejectedValue(conflictError);

    const result = await publishBrandingAction(7);

    expect(result).toEqual({ status: "error", message: "stale", conflict: true });
  });
});
