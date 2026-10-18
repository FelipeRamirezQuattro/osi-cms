import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockProxyClient } = vi.hoisted(() => ({ mockProxyClient: vi.fn() }));
vi.mock("@/lib/db/client", () => ({ createProxyDbClient: mockProxyClient, createServerDbClient: vi.fn() }));

import { getRedirectIndex, REDIRECT_CACHE_TTL_MS, resetRedirectCacheForTests } from "@/lib/data/redirects";
import { matchRedirect } from "@/lib/redirects/matcher";

function clientReturning(result: { data: unknown; error: unknown } | Error) {
  const select = vi.fn(() => ({
    abortSignal: () => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result)),
  }));
  mockProxyClient.mockReturnValue({ from: () => ({ select }) });
  return select;
}

const rows = [{ from_path: "/services-4", to_path: "/services", status_code: 301 }];

beforeEach(() => {
  mockProxyClient.mockReset();
  resetRedirectCacheForTests();
});

describe("getRedirectIndex", () => {
  it("queries once and serves the cache until the TTL passes", async () => {
    const select = clientReturning({ data: rows, error: null });
    const first = await getRedirectIndex(0);
    expect(matchRedirect(first!, "/services-4")?.location).toBe("/services");
    await getRedirectIndex(REDIRECT_CACHE_TTL_MS - 1);
    expect(select).toHaveBeenCalledTimes(1);
    await getRedirectIndex(REDIRECT_CACHE_TTL_MS + 1);
    expect(select).toHaveBeenCalledTimes(2);
  });

  it("shares one query between concurrent requests", async () => {
    const select = clientReturning({ data: rows, error: null });
    await Promise.all([getRedirectIndex(0), getRedirectIndex(0), getRedirectIndex(0)]);
    expect(select).toHaveBeenCalledTimes(1);
  });

  it("keeps serving the last good copy when a refresh fails", async () => {
    clientReturning({ data: rows, error: null });
    await getRedirectIndex(0);
    clientReturning({ data: null, error: { message: "boom" } });
    const stale = await getRedirectIndex(REDIRECT_CACHE_TTL_MS + 1);
    expect(matchRedirect(stale!, "/services-4")?.location).toBe("/services");
  });

  it("returns null (fails open, never throws) when there is nothing cached and the query fails", async () => {
    clientReturning(new Error("timeout"));
    await expect(getRedirectIndex(0)).resolves.toBeNull();
    clientReturning({ data: null, error: { message: "rls" } });
    await expect(getRedirectIndex(0)).resolves.toBeNull();
  });
});
