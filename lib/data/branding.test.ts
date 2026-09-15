import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  getBrandingDraft,
  getPublishedBranding,
  listBrandingRevisions,
  publishBranding,
  resetBrandingDraftToPublished,
  restoreBrandingRevisionToDraft,
  saveBrandingDraft,
} from "@/lib/data/branding";
import { OSI_SEED_BRANDING_CONFIG } from "@/lib/branding/seed";

/**
 * Shape assertions against a fake Supabase-shaped client (mocked via
 * @/lib/db/client), mirroring lib/data/pages.test.ts / lib/data/
 * shared-sections.test.ts's pattern: every draft/history read must only
 * ever touch site_branding/site_branding_revisions, the public read
 * (getPublishedBranding) must only ever touch site_branding_publications,
 * and every mutation must only ever go through its atomic RPC.
 */
const { mockCreateServerDbClient } = vi.hoisted(() => ({ mockCreateServerDbClient: vi.fn() }));
vi.mock("@/lib/db/client", () => ({
  createServerDbClient: mockCreateServerDbClient,
}));

function createFakeDbClient(options: { singleData?: unknown; maybeSingleData?: unknown; listData?: unknown[] } = {}) {
  const fromCalls: string[] = [];
  const rpcCalls: { name: string; args: unknown }[] = [];
  const chain: Record<string, unknown> = {};
  chain.select = () => chain;
  chain.eq = () => chain;
  chain.order = () => chain;
  chain.limit = async () => ({ data: options.listData ?? [], error: null });
  chain.maybeSingle = async () => ({ data: options.maybeSingleData ?? null, error: null });
  chain.single = async () => ({ data: options.singleData ?? null, error: null });

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

describe("draft/publish isolation (mirrors the pages/shared-sections regression tests)", () => {
  it("getBrandingDraft only ever queries site_branding", async () => {
    const fake = createFakeDbClient({
      singleData: { id: true, config: OSI_SEED_BRANDING_CONFIG, config_version: 1, primary_logo_media_id: null, draft_version: 1, updated_at: "now", updated_by: null },
    });
    mockCreateServerDbClient.mockReturnValue(fake);

    const draft = await getBrandingDraft();

    expect(fake.fromCalls).toEqual(["site_branding"]);
    expect(fake.rpcCalls).toEqual([]);
    expect(draft.config.configVersion).toBe(1);
  });

  it("getPublishedBranding only ever queries site_branding_publications", async () => {
    const fake = createFakeDbClient({
      maybeSingleData: {
        id: true,
        config: OSI_SEED_BRANDING_CONFIG,
        config_version: 1,
        primary_logo_media_id: null,
        published_version: 1,
        published_at: "now",
        published_by: null,
        updated_at: "now",
      },
    });
    mockCreateServerDbClient.mockReturnValue(fake);

    const published = await getPublishedBranding();

    expect(fake.fromCalls).toEqual(["site_branding_publications"]);
    expect(fake.rpcCalls).toEqual([]);
    expect(published?.config.typography.display).toBe("orbitron");
  });

  it("getPublishedBranding returns null when no publication row exists", async () => {
    const fake = createFakeDbClient({ maybeSingleData: null });
    mockCreateServerDbClient.mockReturnValue(fake);

    expect(await getPublishedBranding()).toBeNull();
  });

  it("saveBrandingDraft only ever goes through save_branding_draft_atomic", async () => {
    const fake = createFakeDbClient();
    mockCreateServerDbClient.mockReturnValue(fake);

    await saveBrandingDraft(OSI_SEED_BRANDING_CONFIG, 1);

    expect(fake.fromCalls).toEqual([]);
    expect(fake.rpcCalls).toEqual([
      { name: "save_branding_draft_atomic", args: { p_config: OSI_SEED_BRANDING_CONFIG, p_expected_version: 1 } },
    ]);
  });

  it("publishBranding only ever goes through publish_branding_atomic", async () => {
    const fake = createFakeDbClient();
    mockCreateServerDbClient.mockReturnValue(fake);

    await publishBranding(3);

    expect(fake.fromCalls).toEqual([]);
    expect(fake.rpcCalls).toEqual([{ name: "publish_branding_atomic", args: { p_expected_version: 3 } }]);
  });

  it("listBrandingRevisions only ever queries site_branding_revisions", async () => {
    const fake = createFakeDbClient({ listData: [] });
    mockCreateServerDbClient.mockReturnValue(fake);

    await listBrandingRevisions();

    expect(fake.fromCalls).toEqual(["site_branding_revisions"]);
    expect(fake.rpcCalls).toEqual([]);
  });

  it("restoreBrandingRevisionToDraft only ever goes through restore_branding_revision_to_draft_atomic", async () => {
    const fake = createFakeDbClient();
    mockCreateServerDbClient.mockReturnValue(fake);

    await restoreBrandingRevisionToDraft("revision-1", 4);

    expect(fake.fromCalls).toEqual([]);
    expect(fake.rpcCalls).toEqual([
      { name: "restore_branding_revision_to_draft_atomic", args: { p_revision_id: "revision-1", p_expected_version: 4 } },
    ]);
  });

  it("resetBrandingDraftToPublished only ever goes through reset_branding_draft_to_published_atomic", async () => {
    const fake = createFakeDbClient();
    mockCreateServerDbClient.mockReturnValue(fake);

    await resetBrandingDraftToPublished(5);

    expect(fake.fromCalls).toEqual([]);
    expect(fake.rpcCalls).toEqual([
      { name: "reset_branding_draft_to_published_atomic", args: { p_expected_version: 5 } },
    ]);
  });
});

describe("branding config parsing", () => {
  it("throws rather than trusting a malformed config from the database", async () => {
    const fake = createFakeDbClient({
      singleData: { id: true, config: { not: "a valid branding config" }, config_version: 1, primary_logo_media_id: null, draft_version: 1, updated_at: "now", updated_by: null },
    });
    mockCreateServerDbClient.mockReturnValue(fake);

    await expect(getBrandingDraft()).rejects.toThrow();
  });
});
