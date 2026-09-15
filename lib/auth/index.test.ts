import { describe, expect, it, vi, beforeEach } from "vitest";
import { publicSlugIsResolvable, requirePublishCapabilityForStatusChange } from "@/lib/auth";

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

const { mockCreateServerClient } = vi.hoisted(() => ({ mockCreateServerClient: vi.fn() }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: mockCreateServerClient,
  createBrowserClient: vi.fn(),
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

/**
 * Task 8 review fix (Critical): publicSlugIsResolvable must fail OPEN
 * (return `true`, i.e. "let Next render normally") on any DB error —
 * both the "Supabase resolves with an error result" shape (`.select()`
 * returns `{ error, count: null }`, it doesn't throw) and the "the call
 * itself throws" shape (network/DNS/TLS failure) — never fail closed.
 * Treating a transient error as "page doesn't exist" would hard-404 real
 * pages during any DB blip; letting an exception propagate out of
 * proxy() uncaught would 500 every single matched request site-wide
 * during the same blip. Both are strictly worse than this function's
 * pre-fix soft-404 behavior for a genuinely missing slug, which is the
 * worst case failing open can produce.
 */
describe("publicSlugIsResolvable", () => {
  function fakeExistenceClient(
    pagePublicationsResult: { count: number | null; error: unknown },
    redirectsResult: { count: number | null; error: unknown },
  ) {
    return {
      from: (table: string) => {
        const chain: Record<string, unknown> = {};
        for (const method of ["select", "eq"]) chain[method] = () => chain;
        chain.then = (resolve: (v: unknown) => void) => {
          const result = table === "page_publications" ? pagePublicationsResult : redirectsResult;
          Promise.resolve(result).then(resolve);
        };
        return chain;
      },
    };
  }

  it("returns true when a page_publications row exists", async () => {
    mockCreateServerClient.mockReturnValue(fakeExistenceClient({ count: 1, error: null }, { count: 0, error: null }));
    expect(await publicSlugIsResolvable("about-us")).toBe(true);
  });

  it("returns true when a redirects row exists (no page)", async () => {
    mockCreateServerClient.mockReturnValue(fakeExistenceClient({ count: 0, error: null }, { count: 1, error: null }));
    expect(await publicSlugIsResolvable("old-path")).toBe(true);
  });

  it("returns false when neither a page nor a redirect exists", async () => {
    mockCreateServerClient.mockReturnValue(fakeExistenceClient({ count: 0, error: null }, { count: 0, error: null }));
    expect(await publicSlugIsResolvable("this-page-does-not-exist")).toBe(false);
  });

  it("fails open when the page_publications query returns an error result (not a throw)", async () => {
    mockCreateServerClient.mockReturnValue(
      fakeExistenceClient({ count: null, error: { message: "statement timeout" } }, { count: 0, error: null }),
    );
    expect(await publicSlugIsResolvable("about-us")).toBe(true);
  });

  it("fails open when the redirects query returns an error result (not a throw)", async () => {
    mockCreateServerClient.mockReturnValue(
      fakeExistenceClient({ count: 0, error: null }, { count: null, error: { message: "pool exhausted" } }),
    );
    expect(await publicSlugIsResolvable("about-us")).toBe(true);
  });

  it("fails open when constructing the client or running the query throws", async () => {
    mockCreateServerClient.mockImplementation(() => {
      throw new Error("network down");
    });
    expect(await publicSlugIsResolvable("about-us")).toBe(true);
  });

  it("never binds request cookies — page_publications/redirects are fully public, and a cookie-bound client here risked silently discarding a real admin session's rotated refresh token", async () => {
    let capturedGetAll: (() => unknown[]) | undefined;
    mockCreateServerClient.mockImplementation((_url: string, _key: string, options: { cookies: { getAll: () => unknown[] } }) => {
      capturedGetAll = options.cookies.getAll;
      return fakeExistenceClient({ count: 0, error: null }, { count: 0, error: null });
    });

    await publicSlugIsResolvable("about-us");

    expect(capturedGetAll?.()).toEqual([]);
  });
});
