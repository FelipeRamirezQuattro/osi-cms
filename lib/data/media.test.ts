import { describe, expect, it, vi, beforeEach } from "vitest";
import { deleteMediaAsset, uploadMediaAsset } from "@/lib/data/media";

/**
 * Task 5: media_assets upload/delete are each single-statement writes
 * that now get a direct recordAudit() call right after they succeed —
 * title/mime/url only, never the uploaded file's bytes (there's nothing
 * secret in a media asset row, but there's also no reason to duplicate
 * binary content into audit_log). Shape-tested against a fake
 * Supabase-shaped client, same pattern as lib/data/pages.test.ts.
 */
const { mockCreateServerDbClient } = vi.hoisted(() => ({ mockCreateServerDbClient: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ createServerDbClient: mockCreateServerDbClient }));

const { mockRecordAudit } = vi.hoisted(() => ({ mockRecordAudit: vi.fn() }));
vi.mock("@/lib/data/audit", () => ({ recordAudit: mockRecordAudit }));

function createFakeDbClient(responses: unknown[]) {
  const queue = [...responses];
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "insert", "delete"]) {
    chain[method] = () => chain;
  }
  chain.maybeSingle = async () => queue.shift();
  chain.single = async () => queue.shift();
  chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
    Promise.resolve(queue.shift()).then(resolve, reject);
  };

  return {
    from: () => chain,
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "https://example.test/media/file.png" } }),
        remove: async () => ({ error: null }),
      }),
    },
  };
}

beforeEach(() => {
  mockCreateServerDbClient.mockReset();
  mockRecordAudit.mockReset().mockResolvedValue(undefined);
});

describe("uploadMediaAsset", () => {
  it("records an 'upload' audit entry with title/mime only, after the row is created", async () => {
    const fake = createFakeDbClient([
      { data: { id: "asset-1", title: "diagram.png", mime: "image/png", url: "https://example.test/media/file.png" }, error: null },
    ]);
    mockCreateServerDbClient.mockReturnValue(fake);

    const file = new File(["binary-bytes"], "diagram.png", { type: "image/png" });
    await uploadMediaAsset(file, "A diagram of the separator");

    expect(mockRecordAudit).toHaveBeenCalledWith("upload", "media_asset", "asset-1", {
      title: "diagram.png",
      mime: "image/png",
    });
  });
});

describe("deleteMediaAsset", () => {
  it("records a 'delete' audit entry after the asset is removed", async () => {
    const fake = createFakeDbClient([
      { data: { url: "https://example.test/media/media/file.png", source: "uploaded" }, error: null }, // pre-delete read
      { error: null }, // the delete itself
    ]);
    mockCreateServerDbClient.mockReturnValue(fake);

    await deleteMediaAsset("asset-1");

    expect(mockRecordAudit).toHaveBeenCalledWith("delete", "media_asset", "asset-1", {
      url: "https://example.test/media/media/file.png",
    });
  });

  it("never calls recordAudit when the asset no longer exists", async () => {
    const fake = createFakeDbClient([{ data: null, error: null }]);
    mockCreateServerDbClient.mockReturnValue(fake);

    await deleteMediaAsset("missing-id");

    expect(mockRecordAudit).not.toHaveBeenCalled();
  });
});
