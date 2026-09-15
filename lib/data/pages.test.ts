import { describe, expect, it, vi, beforeEach } from "vitest";
import { archivePage, getPageBySlug, isVersionConflictError, publishPage, restorePage, restorePageRevision, savePageDraft } from "@/lib/data/pages";

/**
 * Draft/publish isolation regression (Task 3's fix, asserted here so it
 * stays fixed): getPageBySlug (what every public route reads) must only
 * ever read from page_publications, and savePageDraft (what the admin
 * editor's autosave/save writes) must only ever go through the
 * save_page_draft_atomic RPC — never touching page_publications directly.
 * If either changed to read/write the live `pages`/`page_blocks` tables
 * instead, an unpublished draft edit would leak onto the public site
 * immediately instead of waiting for Publish.
 *
 * This is a shape assertion against a fake Supabase-shaped client (mocked
 * via @/lib/db/client), not a live-DB integration test — see the Task 1
 * brief's ruling on why a full DB round-trip is out of scope here.
 */
const { mockCreateServerDbClient } = vi.hoisted(() => ({ mockCreateServerDbClient: vi.fn() }));
vi.mock("@/lib/db/client", () => ({
  createServerDbClient: mockCreateServerDbClient,
}));

function createFakeDbClient() {
  const fromCalls: string[] = [];
  const rpcCalls: { name: string; args: unknown }[] = [];
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.like = () => chain;
  chain.order = () => chain;
  chain.maybeSingle = async () => ({ data: null, error: null });
  chain.single = async () => ({ data: null, error: null });

  return {
    from: (table: string) => {
      fromCalls.push(table);
      return chain;
    },
    rpc: async (name: string, args: unknown) => {
      rpcCalls.push({ name, args });
      return { data: 2, error: null };
    },
    fromCalls,
    rpcCalls,
  };
}

describe("draft/publish isolation (regression — already fixed by Task 3)", () => {
  beforeEach(() => {
    mockCreateServerDbClient.mockReset();
  });

  it("getPageBySlug (public reads) only ever queries page_publications", async () => {
    const fake = createFakeDbClient();
    mockCreateServerDbClient.mockReturnValue(fake);

    await getPageBySlug("about-us");

    expect(fake.fromCalls).toEqual(["page_publications"]);
    expect(fake.rpcCalls).toEqual([]);
  });

  it("savePageDraft (admin draft writes) only ever goes through save_page_draft_atomic, never page_publications", async () => {
    const fake = createFakeDbClient();
    mockCreateServerDbClient.mockReturnValue(fake);

    const meta = {
      slug: "about-us",
      locale: "en",
      title: "About Us",
      template: "default",
      seo_title: null,
      seo_description: null,
      og_image_url: null,
      noindex: false,
    };
    await savePageDraft("page-id", meta, [], 1);

    expect(fake.fromCalls).toEqual([]);
    expect(fake.rpcCalls).toEqual([{ name: "save_page_draft_atomic", args: expect.any(Object) }]);
  });
});

/**
 * Task 15's "verify recovery of a page version" — restorePageRevision is
 * pre-existing (Task 3), not new in this task; this asserts the actual
 * behavior the brief asked to confirm still works: it reads the
 * requested revision's stored `{ meta, blocks }` snapshot and overwrites
 * the *current draft* with it via the same save_page_draft_atomic RPC
 * every ordinary Save draft uses (optimistic concurrency and all) —
 * never a special "restore" write path of its own that could drift from
 * how a normal save behaves. A real, authenticated live click-through in
 * `/admin` was not performed — this implementer environment has no
 * seeded admin account and the remediation plan's standing rules forbid
 * running create-admin/seed scripts; see docs/BACKUP-RESTORE.md for the
 * full accounting of what was and wasn't verified.
 */
describe("restorePageRevision (Task 15 — verifying this Task 3 flow still works)", () => {
  beforeEach(() => {
    mockCreateServerDbClient.mockReset();
  });

  it("loads the revision's snapshot and re-saves it as the current draft via save_page_draft_atomic", async () => {
    const snapshot = {
      meta: { slug: "about-us", locale: "en", title: "About Us (older)", template: "default" },
      blocks: [{ type: "rich_text", is_visible: true, data: { text: "old copy" }, position: 0 }],
    };
    const rpcCalls: { name: string; args: unknown }[] = [];
    const fake = {
      from: (table: string) => {
        expect(table).toBe("page_revisions");
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({ data: { snapshot }, error: null }),
              }),
            }),
          }),
        };
      },
      rpc: async (name: string, args: unknown) => {
        rpcCalls.push({ name, args });
        return { data: 7, error: null };
      },
    };
    mockCreateServerDbClient.mockReturnValue(fake);

    const newVersion = await restorePageRevision("page-id", "revision-id", 3);

    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0].name).toBe("save_page_draft_atomic");
    const args = rpcCalls[0].args as Record<string, unknown>;
    expect(args.p_page_id).toBe("page-id");
    expect(args.p_expected_version).toBe(3);
    expect(args.p_meta).toEqual(snapshot.meta);
    // Restoring re-derives the plain BlockInput shape (type/is_visible/data)
    // from each revision block row — position isn't passed through, since
    // save_page_draft_atomic recomputes position from array order.
    expect(args.p_blocks).toEqual([{ type: "rich_text", is_visible: true, data: { text: "old copy" } }]);
    expect(newVersion).toBe(7);
  });
});

describe("archive/restore (Task 15)", () => {
  beforeEach(() => {
    mockCreateServerDbClient.mockReset();
  });

  it("archivePage calls archive_page_atomic with the page id", async () => {
    const fake = createFakeDbClient();
    mockCreateServerDbClient.mockReturnValue(fake);
    await archivePage("page-id");
    expect(fake.rpcCalls).toEqual([{ name: "archive_page_atomic", args: { p_page_id: "page-id" } }]);
  });

  it("restorePage calls restore_page_atomic with the page id", async () => {
    const fake = createFakeDbClient();
    mockCreateServerDbClient.mockReturnValue(fake);
    await restorePage("page-id");
    expect(fake.rpcCalls).toEqual([{ name: "restore_page_atomic", args: { p_page_id: "page-id" } }]);
  });

  it("publishPage defaults createRedirect to false and passes through an explicit true", async () => {
    const fake = createFakeDbClient();
    mockCreateServerDbClient.mockReturnValue(fake);

    await publishPage("page-id", 4);
    await publishPage("page-id", 4, { createRedirect: true, redirectStatusCode: 308 });

    expect(fake.rpcCalls[0].args).toMatchObject({ p_create_redirect: false, p_redirect_status_code: 301 });
    expect(fake.rpcCalls[1].args).toMatchObject({ p_create_redirect: true, p_redirect_status_code: 308 });
  });
});

describe("isVersionConflictError", () => {
  it("recognizes a Postgres 40001 (serialization failure) error object", () => {
    expect(isVersionConflictError({ code: "40001", message: "stale" })).toBe(true);
  });

  it("rejects other Postgres error codes", () => {
    expect(isVersionConflictError({ code: "23505", message: "duplicate slug" })).toBe(false);
    expect(isVersionConflictError({ code: "42501", message: "not authorized" })).toBe(false);
  });

  it("rejects non-error-shaped values without throwing", () => {
    expect(isVersionConflictError(null)).toBe(false);
    expect(isVersionConflictError(undefined)).toBe(false);
    expect(isVersionConflictError("plain string error")).toBe(false);
    expect(isVersionConflictError(new Error("generic failure"))).toBe(false);
    expect(isVersionConflictError({})).toBe(false);
  });
});
