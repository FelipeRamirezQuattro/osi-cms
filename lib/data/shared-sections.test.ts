import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getPublishedSharedSectionByKey,
  publishSharedSection,
  saveSharedSectionDraft,
  unpublishSharedSection,
  deleteSharedSection,
} from "@/lib/data/shared-sections";

/**
 * Shape assertions against a fake Supabase-shaped client (mocked via
 * @/lib/db/client), mirroring lib/data/pages.test.ts's pattern for the
 * exact same reason: the public read path must only ever touch
 * shared_section_publications (never the draft tables), and every draft
 * mutation must only ever go through its atomic RPC — never a direct
 * write to shared_section_publications. This is what keeps an unpublished
 * shared-section edit from leaking onto the public site before an
 * explicit Publish (Task 10's acceptance criterion).
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

beforeEach(() => {
  mockCreateServerDbClient.mockReset();
});

describe("draft/publish isolation (mirrors the pages regression test)", () => {
  it("getPublishedSharedSectionByKey (public reads) only ever queries shared_section_publications", async () => {
    const fake = createFakeDbClient();
    mockCreateServerDbClient.mockReturnValue(fake);

    await getPublishedSharedSectionByKey("footer-cta");

    expect(fake.fromCalls).toEqual(["shared_section_publications"]);
    expect(fake.rpcCalls).toEqual([]);
  });

  it("saveSharedSectionDraft (admin draft writes) only ever goes through save_shared_section_draft_atomic", async () => {
    const fake = createFakeDbClient();
    mockCreateServerDbClient.mockReturnValue(fake);

    await saveSharedSectionDraft("section-id", "Footer CTA", [], 1);

    expect(fake.fromCalls).toEqual([]);
    expect(fake.rpcCalls).toEqual([
      {
        name: "save_shared_section_draft_atomic",
        args: {
          p_section_id: "section-id",
          p_title: "Footer CTA",
          p_blocks: [],
          p_expected_version: 1,
        },
      },
    ]);
  });

  it("publishSharedSection only ever goes through publish_shared_section_atomic", async () => {
    const fake = createFakeDbClient();
    mockCreateServerDbClient.mockReturnValue(fake);

    await publishSharedSection("section-id", 2);

    expect(fake.fromCalls).toEqual([]);
    expect(fake.rpcCalls).toEqual([
      { name: "publish_shared_section_atomic", args: { p_section_id: "section-id", p_expected_version: 2 } },
    ]);
  });

  it("unpublishSharedSection only ever goes through unpublish_shared_section_atomic", async () => {
    const fake = createFakeDbClient();
    mockCreateServerDbClient.mockReturnValue(fake);

    await unpublishSharedSection("section-id");

    expect(fake.fromCalls).toEqual([]);
    expect(fake.rpcCalls).toEqual([{ name: "unpublish_shared_section_atomic", args: { p_section_id: "section-id" } }]);
  });

  it("deleteSharedSection only ever goes through delete_shared_section_atomic", async () => {
    const fake = createFakeDbClient();
    mockCreateServerDbClient.mockReturnValue(fake);

    await deleteSharedSection("section-id");

    expect(fake.fromCalls).toEqual([]);
    expect(fake.rpcCalls).toEqual([{ name: "delete_shared_section_atomic", args: { p_section_id: "section-id" } }]);
  });
});

describe("getPublishedSharedSectionByKey", () => {
  it("filters to visible blocks, sorted by position, from the publication snapshot", async () => {
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.maybeSingle = async () => ({
      data: {
        key: "footer-cta",
        snapshot: {
          title: "Footer CTA",
          blocks: [
            { id: "b2", type: "cta_band", position: 1, is_visible: true, data: {} },
            { id: "b1", type: "rich_text", position: 0, is_visible: true, data: {} },
            { id: "b3", type: "rich_text", position: 2, is_visible: false, data: {} },
          ],
        },
      },
      error: null,
    });
    mockCreateServerDbClient.mockReturnValue({ from: () => chain });

    const result = await getPublishedSharedSectionByKey("footer-cta");

    expect(result?.title).toBe("Footer CTA");
    expect(result?.blocks.map((b) => b.id)).toEqual(["b1", "b2"]);
  });

  it("returns null when no publication exists for the key", async () => {
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.maybeSingle = async () => ({ data: null, error: null });
    mockCreateServerDbClient.mockReturnValue({ from: () => chain });

    const result = await getPublishedSharedSectionByKey("does-not-exist");

    expect(result).toBeNull();
  });
});
