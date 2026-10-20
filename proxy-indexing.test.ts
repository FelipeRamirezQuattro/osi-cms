import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

/** W1: the review site is kept out of search engines; the live domain is not. */
const { mockPublicSlugIsResolvable } = vi.hoisted(() => ({ mockPublicSlugIsResolvable: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  guardAdminRequest: vi.fn(async () => new Response(null, { status: 200 })),
  publicSlugIsResolvable: mockPublicSlugIsResolvable,
}));
vi.mock("@/lib/analytics/log-bot-visit", () => ({ logBotVisitIfMatched: vi.fn() }));
vi.mock("@/lib/data/redirects", () => ({ getRedirectIndex: vi.fn(async () => null) }));

function req(path: string, host: string) {
  return new NextRequest(new URL(path, `https://${host}`), { headers: { host } });
}

beforeEach(() => {
  mockPublicSlugIsResolvable.mockResolvedValue(true);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy — X-Robots-Tag", () => {
  it("noindexes the review site, including /admin responses", async () => {
    expect((await proxy(req("/products", "osi-cms.vercel.app"))).headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect((await proxy(req("/admin/pages", "osi-cms.vercel.app"))).headers.get("x-robots-tag")).toBe(
      "noindex, nofollow",
    );
  });

  it("noindexes the production host until SITE_INDEXABLE is on", async () => {
    expect((await proxy(req("/products", "odessaseparator.com"))).headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("sends no noindex header on the live domain once SITE_INDEXABLE=true", async () => {
    vi.stubEnv("SITE_INDEXABLE", "true");
    expect((await proxy(req("/products", "odessaseparator.com"))).headers.get("x-robots-tag")).toBeNull();
    expect((await proxy(req("/products", "www.odessaseparator.com"))).headers.get("x-robots-tag")).toBeNull();
  });

  it("still noindexes review and preview hosts when SITE_INDEXABLE=true leaks to them", async () => {
    vi.stubEnv("SITE_INDEXABLE", "true");
    expect((await proxy(req("/", "osi-cms.vercel.app"))).headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect((await proxy(req("/", "osi-cms-git-main-x.vercel.app"))).headers.get("x-robots-tag")).toBe(
      "noindex, nofollow",
    );
  });
});

describe("proxy — review host 301", () => {
  it("does not redirect until REVIEW_HOST_REDIRECT=true", async () => {
    const res = await proxy(req("/products?a=1", "osi-cms.vercel.app"));
    expect(res.status).not.toBe(301);
  });

  it("301s the review host to the same path and query on odessaseparator.com", async () => {
    vi.stubEnv("REVIEW_HOST_REDIRECT", "true");
    const res = await proxy(req("/products/x?a=1", "osi-cms.vercel.app"));
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe("https://odessaseparator.com/products/x?a=1");
  });

  it("never redirects preview deployments", async () => {
    vi.stubEnv("REVIEW_HOST_REDIRECT", "true");
    const res = await proxy(req("/", "osi-cms-git-feature-team.vercel.app"));
    expect(res.status).not.toBe(301);
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });
});
