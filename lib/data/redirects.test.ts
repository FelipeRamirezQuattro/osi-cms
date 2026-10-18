import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockProxyClient } = vi.hoisted(() => ({ mockProxyClient: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ createProxyDbClient: mockProxyClient }));

import { getRedirectByPath, getRedirectIndex, REDIRECT_CACHE_TTL_MS, resetRedirectCacheForTests } from "@/lib/data/redirects";
import { matchRedirect } from "@/lib/redirects/matcher";

type Result = { data: unknown; error: unknown } | Error;
const settle = (r: Result) => (r instanceof Error ? Promise.reject(r) : Promise.resolve(r));

/** A proxy client whose redirect_index() RPC and plain-select fallback return the given results. */
function client({ rpc, plain }: { rpc: Result; plain?: Result }) {
  const rpcFn = vi.fn(() => ({ abortSignal: () => settle(rpc) }));
  const select = vi.fn(() => ({ abortSignal: () => settle(plain ?? { data: [], error: null }) }));
  mockProxyClient.mockReturnValue({ rpc: rpcFn, from: () => ({ select }) });
  return { rpcFn, select };
}

const indexRow = (over: Record<string, unknown>) => ({
  from_path: "/old",
  to_path: null,
  status_code: 301,
  target_kind: "path",
  product_published: null,
  product_slug: null,
  category_slug: null,
  page_published: null,
  page_slug: null,
  fallback_path: null,
  ...over,
});
const rows = [indexRow({ from_path: "/services-4", to_path: "/services" })];

beforeEach(() => {
  mockProxyClient.mockReset();
  resetRedirectCacheForTests();
});

describe("getRedirectIndex", () => {
  it("queries once and serves the cache until the TTL passes", async () => {
    const { rpcFn } = client({ rpc: { data: rows, error: null } });
    const first = await getRedirectIndex(0);
    expect(matchRedirect(first!, "/services-4")?.location).toBe("/services");
    await getRedirectIndex(REDIRECT_CACHE_TTL_MS - 1);
    expect(rpcFn).toHaveBeenCalledTimes(1);
    await getRedirectIndex(REDIRECT_CACHE_TTL_MS + 1);
    expect(rpcFn).toHaveBeenCalledTimes(2);
  });

  it("resolves product and page targets from the single query's status/category data", async () => {
    client({
      rpc: {
        data: [
          indexRow({ from_path: "/published-product", target_kind: "product", product_published: true, product_slug: "esp-chem-screen", category_slug: "pumps" }),
          indexRow({ from_path: "/draft-product", target_kind: "product", product_published: false, category_slug: "sand-control" }),
          indexRow({ from_path: "/no-category", target_kind: "product", product_published: false }),
          indexRow({ from_path: "/draft-page", target_kind: "page", page_published: false, fallback_path: "/news" }),
          indexRow({ from_path: "/live-page", target_kind: "page", page_published: true, page_slug: "services/pump-cards" }),
          indexRow({ from_path: "/draft-page-no-fallback", target_kind: "page", page_published: false }),
        ],
        error: null,
      },
    });
    const index = (await getRedirectIndex(0))!;
    const to = (p: string) => matchRedirect(index, p)?.location;
    expect(to("/published-product")).toBe("/products/pumps/esp-chem-screen");
    expect(to("/draft-product")).toBe("/products?category=sand-control");
    expect(to("/no-category")).toBe("/products");
    expect(to("/draft-page")).toBe("/news");
    expect(to("/live-page")).toBe("/services/pump-cards");
    expect(to("/draft-page-no-fallback")).toBe("/");
  });

  it("falls back to plain path redirects when redirect_index() isn't available (migration 0052 not applied)", async () => {
    client({
      rpc: { data: null, error: { message: "function not found" } },
      plain: { data: [{ from_path: "/services-4", to_path: "/services", status_code: 301 }, { from_path: "/ref", to_path: null, status_code: 301 }], error: null },
    });
    const index = (await getRedirectIndex(0))!;
    expect(matchRedirect(index, "/services-4")?.location).toBe("/services");
    expect(matchRedirect(index, "/ref")).toBeNull();
  });

  it("shares one query between concurrent requests", async () => {
    const { rpcFn } = client({ rpc: { data: rows, error: null } });
    await Promise.all([getRedirectIndex(0), getRedirectIndex(0), getRedirectIndex(0)]);
    expect(rpcFn).toHaveBeenCalledTimes(1);
  });

  it("keeps serving the last good copy when a refresh fails", async () => {
    client({ rpc: { data: rows, error: null } });
    await getRedirectIndex(0);
    client({ rpc: { data: null, error: { message: "boom" } }, plain: { data: null, error: { message: "boom" } } });
    const stale = await getRedirectIndex(REDIRECT_CACHE_TTL_MS + 1);
    expect(matchRedirect(stale!, "/services-4")?.location).toBe("/services");
  });

  it("returns null (fails open, never throws) when there is nothing cached and every query fails", async () => {
    client({ rpc: new Error("timeout"), plain: new Error("timeout") });
    await expect(getRedirectIndex(0)).resolves.toBeNull();
  });
});

describe("getRedirectByPath (catch-all fallback)", () => {
  it("returns the resolved target and stored status", async () => {
    client({ rpc: { data: [indexRow({ from_path: "/gforce", target_kind: "product", product_published: false, category_slug: "gas-separation", status_code: 301 })], error: null } });
    expect(await getRedirectByPath("/gforce")).toEqual({ to_path: "/products?category=gas-separation", status_code: 301 });
    expect(await getRedirectByPath("/nope")).toBeNull();
  });
});
