import { describe, expect, it, vi, beforeEach } from "vitest";
import { getPageBySlug, isVersionConflictError, savePageDraft } from "@/lib/data/pages";

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
