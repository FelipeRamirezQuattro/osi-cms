import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  countMissingAltMedia,
  deleteMediaAsset,
  deleteMediaAssetProtected,
  findMediaAssetUsages,
  replaceMediaAsset,
  uploadMediaAsset,
} from "@/lib/data/media";
import { adminHref } from "@/lib/routes";

/**
 * Task 11: media_assets upload/delete are no longer single-statement
 * writes with no failure handling — uploadMediaAsset is now a
 * compensating transaction (Storage upload, then a DB row; if the row
 * fails, the Storage object is removed so it never becomes an orphan),
 * and deleteMediaAsset now actually checks the Storage removal's error
 * (previously ignored — a real bug: a failed Storage delete still fell
 * through to deleting the DB row, silently orphaning the file while its
 * row vanished).
 *
 * The fake client below is a per-table FIFO queue (extends the shape
 * lib/data/audit.test.ts/lib/data/pages.test.ts already use for a single
 * table) since findMediaAssetUsages/replaceMediaAsset touch several
 * tables in a fixed, implementation-known order — see each test's
 * comment for exactly which calls it's queuing responses for.
 */
const { mockCreateServerDbClient } = vi.hoisted(() => ({ mockCreateServerDbClient: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ createServerDbClient: mockCreateServerDbClient }));

const { mockRecordAudit } = vi.hoisted(() => ({ mockRecordAudit: vi.fn() }));
vi.mock("@/lib/data/audit", () => ({ recordAudit: mockRecordAudit }));

type TableQueues = Record<string, unknown[]>;

function createFakeDbClient(
  tableQueues: TableQueues,
  storage: Partial<{
    upload: () => Promise<{ error: unknown }>;
    remove: (paths: string[]) => Promise<{ error: unknown }>;
    getPublicUrl: () => { data: { publicUrl: string } };
  }> = {},
) {
  function makeChain(table: string) {
    const queue = tableQueues[table] ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {};
    for (const method of ["select", "eq", "insert", "update", "delete", "or", "not", "contains", "order", "range"]) {
      chain[method] = () => chain;
    }
    chain.maybeSingle = async () => queue.shift();
    chain.single = async () => queue.shift();
    chain.then = (resolve: (v: unknown) => void, reject?: (e: unknown) => void) => {
      Promise.resolve(queue.shift()).then(resolve, reject);
    };
    return chain;
  }

  return {
    from: (table: string) => makeChain(table),
    storage: {
      from: () => ({
        upload: storage.upload ?? (async () => ({ error: null })),
        getPublicUrl: storage.getPublicUrl ?? (() => ({ data: { publicUrl: "https://example.test/media/file.png" } })),
        remove: storage.remove ?? (async () => ({ error: null })),
      }),
    },
  };
}

/** The 7 direct-lookup tables findMediaAssetUsages/replaceMediaAssetEverywhere iterate, in DIRECT_LOOKUPS order — "products" is queried twice (hero, then diagram). */
function emptyDirectLookupQueues(): TableQueues {
  return {
    pages: [{ data: [], error: null }],
    products: [
      { data: [], error: null }, // hero_image_url
      { data: [], error: null }, // diagram_image_url
    ],
    product_stages: [{ data: [], error: null }],
    news_posts: [{ data: [], error: null }],
    directory_contacts: [{ data: [], error: null }],
    resources: [{ data: [], error: null }],
    site_settings: [{ data: [], error: null }],
  };
}

beforeEach(() => {
  mockCreateServerDbClient.mockReset();
  mockRecordAudit.mockReset().mockResolvedValue(undefined);
});

describe("uploadMediaAsset", () => {
  it("rejects an unsupported file before ever touching storage", async () => {
    const upload = vi.fn(async () => ({ error: null }));
    mockCreateServerDbClient.mockReturnValue(createFakeDbClient({}, { upload }));

    const file = new File(["x"], "clip.mp4", { type: "video/mp4" });
    await expect(uploadMediaAsset(file, { alt: "a clip" })).rejects.toThrow(/unsupported file type/i);
    expect(upload).not.toHaveBeenCalled();
  });

  it("rejects a meaningful image with no alt text and no decorative flag before touching storage", async () => {
    const upload = vi.fn(async () => ({ error: null }));
    mockCreateServerDbClient.mockReturnValue(createFakeDbClient({}, { upload }));

    const file = new File(["x"], "diagram.png", { type: "image/png" });
    await expect(uploadMediaAsset(file, {})).rejects.toThrow(/alt text is required/i);
    expect(upload).not.toHaveBeenCalled();
  });

  it("uploads a decorative image with no alt text", async () => {
    const fake = createFakeDbClient({
      media_assets: [{ data: { id: "asset-1", title: "bg.png", mime: "image/png" }, error: null }],
    });
    mockCreateServerDbClient.mockReturnValue(fake);

    const file = new File(["x"], "bg.png", { type: "image/png" });
    const asset = await uploadMediaAsset(file, { decorative: true });
    expect(asset.id).toBe("asset-1");
    expect(mockRecordAudit).toHaveBeenCalledWith("upload", "media_asset", "asset-1", {
      title: "bg.png",
      mime: "image/png",
      kind: "image",
    });
  });

  it("removes the just-uploaded storage object when the row insert fails (compensating transaction)", async () => {
    const remove = vi.fn(async () => ({ error: null }));
    const fake = createFakeDbClient(
      { media_assets: [{ data: null, error: { message: "db is down" } }] },
      { remove },
    );
    mockCreateServerDbClient.mockReturnValue(fake);

    const file = new File(["x"], "diagram.png", { type: "image/png" });
    await expect(uploadMediaAsset(file, { alt: "a diagram" })).rejects.toThrow(/db is down/);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });

  it("surfaces BOTH failures (never silently swallowed) when the row insert fails AND the cleanup removal also fails", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const remove = vi.fn(async () => ({ error: { message: "storage is also down" } }));
    const fake = createFakeDbClient(
      { media_assets: [{ data: null, error: { message: "db is down" } }] },
      { remove },
    );
    mockCreateServerDbClient.mockReturnValue(fake);

    const file = new File(["x"], "diagram.png", { type: "image/png" });
    await expect(uploadMediaAsset(file, { alt: "a diagram" })).rejects.toThrow(
      /db is down.*storage is also down|orphaned/i,
    );
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });
});

describe("deleteMediaAsset", () => {
  it("does NOT delete the row when the storage object removal fails (fixes a previously-silent bug)", async () => {
    const remove = vi.fn(async () => ({ error: { message: "storage unavailable" } }));
    const fake = createFakeDbClient(
      { media_assets: [{ data: { url: "https://x.test/media/file.png", source: "uploaded" }, error: null }] },
      { remove },
    );
    mockCreateServerDbClient.mockReturnValue(fake);

    await expect(deleteMediaAsset("asset-1")).rejects.toThrow(/storage unavailable/);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });

  it("deletes the row and records an audit entry once storage removal succeeds", async () => {
    const fake = createFakeDbClient({
      media_assets: [
        { data: { url: "https://x.test/media/file.png", source: "uploaded" }, error: null }, // pre-delete read
        { error: null }, // the delete itself
      ],
    });
    mockCreateServerDbClient.mockReturnValue(fake);

    await deleteMediaAsset("asset-1");
    expect(mockRecordAudit).toHaveBeenCalledWith("delete", "media_asset", "asset-1", {
      url: "https://x.test/media/file.png",
    });
  });

  it("never touches storage for a legacy (non-uploaded) asset", async () => {
    const remove = vi.fn(async () => ({ error: null }));
    const fake = createFakeDbClient(
      {
        media_assets: [
          { data: { url: "https://static.wixstatic.com/media/x.jpg", source: "legacy" }, error: null },
          { error: null },
        ],
      },
      { remove },
    );
    mockCreateServerDbClient.mockReturnValue(fake);

    await deleteMediaAsset("asset-legacy");
    expect(remove).not.toHaveBeenCalled();
  });
});

describe("findMediaAssetUsages", () => {
  it("returns nothing for a URL referenced nowhere", async () => {
    const fake = createFakeDbClient({
      page_blocks: [{ data: [], error: null }],
      ...emptyDirectLookupQueues(),
    });
    mockCreateServerDbClient.mockReturnValue(fake);

    expect(await findMediaAssetUsages("https://x.test/unused.jpg")).toEqual([]);
  });

  it("finds a usage buried in a page_block's jsonb data, labeled with the page title and block type", async () => {
    const fake = createFakeDbClient({
      page_blocks: [
        {
          data: [
            {
              id: "block-1",
              type: "image",
              page_id: "page-1",
              data: { imageUrl: "https://x.test/hero.jpg", alt: "hero" },
              pages: { id: "page-1", title: "Home" },
            },
          ],
          error: null,
        },
      ],
      ...emptyDirectLookupQueues(),
    });
    mockCreateServerDbClient.mockReturnValue(fake);

    const usages = await findMediaAssetUsages("https://x.test/hero.jpg");
    expect(usages).toEqual([
      { source: "page_block", id: "block-1", label: "Home — image block", editHref: adminHref("pages", "page-1") },
    ]);
  });

  it("finds a usage in a direct column (products.hero_image_url)", async () => {
    const fake = createFakeDbClient({
      page_blocks: [{ data: [], error: null }],
      pages: [{ data: [], error: null }],
      products: [
        { data: [{ id: "product-1", name: "Gas Release System" }], error: null }, // hero_image_url match
        { data: [], error: null }, // diagram_image_url
      ],
      product_stages: [{ data: [], error: null }],
      news_posts: [{ data: [], error: null }],
      directory_contacts: [{ data: [], error: null }],
      resources: [{ data: [], error: null }],
      site_settings: [{ data: [], error: null }],
    });
    mockCreateServerDbClient.mockReturnValue(fake);

    const usages = await findMediaAssetUsages("https://x.test/hero.jpg");
    expect(usages).toEqual([
      {
        source: "product",
        id: "product-1",
        label: "Gas Release System (hero image)",
        editHref: adminHref("products", "product-1"),
      },
    ]);
  });
});

describe("deleteMediaAssetProtected", () => {
  it("blocks deletion and returns the usage list when the asset is still referenced", async () => {
    const fake = createFakeDbClient({
      media_assets: [{ data: { id: "asset-1", url: "https://x.test/hero.jpg", source: "uploaded" }, error: null }],
      page_blocks: [{ data: [], error: null }],
      pages: [{ data: [], error: null }],
      products: [
        { data: [{ id: "product-1", name: "Gas Release System" }], error: null },
        { data: [], error: null },
      ],
      product_stages: [{ data: [], error: null }],
      news_posts: [{ data: [], error: null }],
      directory_contacts: [{ data: [], error: null }],
      resources: [{ data: [], error: null }],
      site_settings: [{ data: [], error: null }],
    });
    mockCreateServerDbClient.mockReturnValue(fake);

    const result = await deleteMediaAssetProtected("asset-1");
    expect(result.status).toBe("blocked");
    if (result.status === "blocked") {
      expect(result.usages).toHaveLength(1);
      expect(result.usages[0].source).toBe("product");
    }
    expect(mockRecordAudit).not.toHaveBeenCalled();
  });

  it("deletes when the asset has no remaining usages", async () => {
    const fake = createFakeDbClient({
      media_assets: [
        { data: { id: "asset-1", url: "https://x.test/unused.jpg", source: "uploaded" }, error: null }, // getMediaAssetById
        { data: { url: "https://x.test/unused.jpg", source: "uploaded" }, error: null }, // deleteMediaAsset's own pre-delete read
        { error: null }, // the delete itself
      ],
      page_blocks: [{ data: [], error: null }],
      ...emptyDirectLookupQueues(),
    });
    mockCreateServerDbClient.mockReturnValue(fake);

    const result = await deleteMediaAssetProtected("asset-1");
    expect(result).toEqual({ status: "deleted" });
    expect(mockRecordAudit).toHaveBeenCalledWith("delete", "media_asset", "asset-1", {
      url: "https://x.test/unused.jpg",
    });
  });

  it("treats an already-gone asset as a no-op success rather than an error", async () => {
    const fake = createFakeDbClient({ media_assets: [{ data: null, error: null }] });
    mockCreateServerDbClient.mockReturnValue(fake);

    expect(await deleteMediaAssetProtected("missing-id")).toEqual({ status: "deleted" });
  });
});

describe("replaceMediaAsset", () => {
  it("rewrites every usage's URL and stamps the old asset with what replaced it", async () => {
    const fake = createFakeDbClient({
      media_assets: [
        { data: { id: "old-1", url: "https://x.test/old.jpg" }, error: null }, // getMediaAssetById(old)
        { data: { id: "new-1", url: "https://x.test/new.jpg" }, error: null }, // getMediaAssetById(new)
        { error: null }, // the replaced_by/replaced_at update
      ],
      page_blocks: [
        {
          data: [{ id: "block-1", data: { imageUrl: "https://x.test/old.jpg" } }],
          error: null,
        }, // the initial select
        { error: null }, // the rewrite update for block-1 (its data matched oldUrl)
      ],
      pages: [{ data: [], error: null }],
      products: [
        { data: [], error: null },
        { data: [], error: null },
      ],
      product_stages: [{ data: [], error: null }],
      news_posts: [{ data: [], error: null }],
      directory_contacts: [{ data: [], error: null }],
      resources: [{ data: [], error: null }],
      site_settings: [{ data: [], error: null }],
    });
    mockCreateServerDbClient.mockReturnValue(fake);

    const result = await replaceMediaAsset("old-1", "new-1");
    expect(result).toEqual({ updated: 1 });
    expect(mockRecordAudit).toHaveBeenCalledWith("replace", "media_asset", "old-1", {
      replacedWith: "new-1",
      updatedBlocks: 1,
      updatedColumns: 0,
    });
  });

  it("refuses to replace an asset with itself", async () => {
    mockCreateServerDbClient.mockReturnValue(createFakeDbClient({}));
    await expect(replaceMediaAsset("same-id", "same-id")).rejects.toThrow(/different asset/i);
  });
});

describe("countMissingAltMedia", () => {
  it("counts only non-decorative image rows with blank/missing alt text", async () => {
    mockCreateServerDbClient.mockReturnValue(
      createFakeDbClient({
        media_assets: [
          {
            data: [
              { alt: "", decorative: false }, // missing alt -> counts
              { alt: "   ", decorative: false }, // whitespace-only alt -> counts (validateAltRequirement trims)
              { alt: "A real forklift photo", decorative: false }, // has alt -> doesn't count
              { alt: null, decorative: false }, // null alt -> counts
            ],
            error: null,
          },
        ],
      }),
    );

    expect(await countMissingAltMedia()).toBe(3);
  });

  it("returns 0 when every candidate row already has alt text", async () => {
    mockCreateServerDbClient.mockReturnValue(
      createFakeDbClient({
        media_assets: [{ data: [{ alt: "Fine", decorative: false }], error: null }],
      }),
    );
    expect(await countMissingAltMedia()).toBe(0);
  });

  it("returns 0 for an empty result set", async () => {
    mockCreateServerDbClient.mockReturnValue(createFakeDbClient({ media_assets: [{ data: [], error: null }] }));
    expect(await countMissingAltMedia()).toBe(0);
  });

  it("throws if the query errors", async () => {
    mockCreateServerDbClient.mockReturnValue(
      createFakeDbClient({ media_assets: [{ data: null, error: new Error("boom") }] }),
    );
    await expect(countMissingAltMedia()).rejects.toThrow("boom");
  });
});
