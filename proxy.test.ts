import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

/**
 * Task 8 item #8 — the soft-404 fix. See proxy.ts's top comment for the
 * root cause (app/(site)/loading.tsx's ambient Suspense boundary makes
 * [...slug]/page.tsx's notFound() land as a 200) and why a proxy-level
 * existence check is the documented fix for a non-Cache-Components app.
 *
 * These tests cover the routing/skip logic in isolation — the actual DB
 * read (publicSlugIsResolvable) is mocked, since exercising real RLS
 * behavior is what lib/auth's own future test coverage (or an e2e run
 * against a real server) is for, not this file.
 */
const { mockGuardAdminRequest, mockPublicSlugIsResolvable } = vi.hoisted(() => ({
  mockGuardAdminRequest: vi.fn(),
  mockPublicSlugIsResolvable: vi.fn(),
}));
vi.mock("@/lib/auth", () => ({
  guardAdminRequest: mockGuardAdminRequest,
  publicSlugIsResolvable: mockPublicSlugIsResolvable,
}));

function makeRequest(path: string, init?: { method?: string; headers?: Record<string, string> }) {
  return new NextRequest(new URL(path, "http://localhost:3000"), {
    method: init?.method ?? "GET",
    headers: init?.headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("proxy — admin gating", () => {
  it("delegates every /admin path to guardAdminRequest, without touching the public existence check", async () => {
    const marker = new Response(null, { status: 302 });
    mockGuardAdminRequest.mockResolvedValue(marker);

    const result = await proxy(makeRequest("/admin/pages"));

    expect(mockGuardAdminRequest).toHaveBeenCalledTimes(1);
    expect(mockPublicSlugIsResolvable).not.toHaveBeenCalled();
    expect(result).toBe(marker);
  });
});

describe("proxy — public soft-404 fix", () => {
  it("passes home through without checking anything", async () => {
    const response = await proxy(makeRequest("/"));
    expect(response.status).toBe(200);
    expect(mockPublicSlugIsResolvable).not.toHaveBeenCalled();
  });

  it.each([
    "/products",
    "/products/gas-separation/gas-release-system",
    "/contact",
    "/search",
    "/news",
    "/news/some-post",
    "/resources",
    "/industries/oil-gas",
    "/applications/artificial-lift",
  ])(
    "skips the existence check entirely for %s (its own route handles not-found, out of this fix's scope)",
    async (path) => {
      const response = await proxy(makeRequest(path));
      expect(response.status).toBe(200);
      expect(mockPublicSlugIsResolvable).not.toHaveBeenCalled();
    },
  );

  it("skips asset-shaped paths", async () => {
    await proxy(makeRequest("/favicon.ico"));
    await proxy(makeRequest("/some-image.png"));
    expect(mockPublicSlugIsResolvable).not.toHaveBeenCalled();
  });

  it("skips non-GET/HEAD requests (e.g. a Server Action POST)", async () => {
    await proxy(makeRequest("/about-us", { method: "POST" }));
    expect(mockPublicSlugIsResolvable).not.toHaveBeenCalled();
  });

  it("skips Next's own client-side RSC/prefetch fetches", async () => {
    await proxy(makeRequest("/about-us", { headers: { RSC: "1" } }));
    await proxy(makeRequest("/about-us", { headers: { "Next-Router-Prefetch": "1" } }));
    expect(mockPublicSlugIsResolvable).not.toHaveBeenCalled();
  });

  it("lets a genuine document request through when the slug resolves (a real page or a redirect)", async () => {
    mockPublicSlugIsResolvable.mockResolvedValue(true);

    const response = await proxy(makeRequest("/about-us"));

    expect(mockPublicSlugIsResolvable).toHaveBeenCalledWith(expect.anything(), "about-us");
    expect(response.status).toBe(200);
  });

  it("joins nested segments into one slug for the existence check", async () => {
    mockPublicSlugIsResolvable.mockResolvedValue(true);

    await proxy(makeRequest("/careers/hiring"));

    expect(mockPublicSlugIsResolvable).toHaveBeenCalledWith(expect.anything(), "careers/hiring");
  });

  it("returns a real 404 status with noindex + \"Page not found\" copy when nothing resolves", async () => {
    mockPublicSlugIsResolvable.mockResolvedValue(false);

    const response = await proxy(makeRequest("/this-page-does-not-exist"));
    const body = await response.text();

    expect(response.status).toBe(404);
    expect(body).toContain("Page not found");
    expect(body).toContain('name="robots" content="noindex"');
  });
});
