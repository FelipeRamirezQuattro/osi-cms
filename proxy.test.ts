import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { proxy, SKIPPED_TOP_SEGMENTS } from "@/proxy";

/**
 * Task 8 item #8 — the soft-404 fix. See proxy.ts's top comment for the
 * root cause (app/(site)/loading.tsx's ambient Suspense boundary makes
 * [...slug]/page.tsx's notFound() land as a 200) and why a proxy-level
 * rewrite to a loading.tsx-free sibling route group is the fix that
 * preserves both a real status code and the on-brand chrome.
 *
 * These tests cover the routing/skip logic in isolation — the actual DB
 * read (publicSlugIsResolvable) is mocked (its own fail-open behavior is
 * covered in lib/auth/index.test.ts), and the final rendered 404 status
 * + chrome is verified against a real `next build && next start` server
 * (see task-8-report.md) — a unit test can't observe the eventual status
 * of a request NextResponse.rewrite() hands off to a different route.
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

    expect(mockPublicSlugIsResolvable).toHaveBeenCalledWith("about-us");
    expect(response.status).toBe(200);
  });

  it("joins nested segments into one slug for the existence check", async () => {
    mockPublicSlugIsResolvable.mockResolvedValue(true);

    await proxy(makeRequest("/careers/hiring"));

    expect(mockPublicSlugIsResolvable).toHaveBeenCalledWith("careers/hiring");
  });

  it("rewrites to the chrome-preserving genuine-404 route when nothing resolves", async () => {
    mockPublicSlugIsResolvable.mockResolvedValue(false);

    const response = await proxy(makeRequest("/this-page-does-not-exist"));

    // NextResponse.rewrite() itself always reports status 200 — it's an
    // internal instruction (the `x-middleware-rewrite` header) consumed
    // by Next's server to route this same request to a different page,
    // not the eventual response the browser sees. That final status
    // (404, with the real chrome) comes from
    // app/(site-404)/system-not-found/page.tsx's own notFound() call —
    // verified against a real build+start server, not here (see this
    // file's top comment).
    const rewriteTarget = response.headers.get("x-middleware-rewrite");
    expect(rewriteTarget).toBeTruthy();
    expect(new URL(rewriteTarget!).pathname).toBe("/system-not-found");
  });
});

describe("SKIPPED_TOP_SEGMENTS stays in sync with app/(site)/", () => {
  it("includes every literal route segment under app/(site)/, plus styleguide/api which live outside it", () => {
    // This already caused one real bug: a missing "resources" entry
    // hard-404'd the real /resources route until caught by manually
    // curling it against a live build (see task-8-report.md). This test
    // turns that into an automatic check instead of relying on whoever
    // adds the next route under app/(site)/ to remember this file exists.
    const siteDir = path.join(process.cwd(), "app", "(site)");
    const segments = fs
      .readdirSync(siteDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => name !== "[...slug]");

    expect(segments.length).toBeGreaterThan(0); // sanity check on the scan itself
    for (const segment of segments) {
      expect(SKIPPED_TOP_SEGMENTS.has(segment), `add "${segment}" to SKIPPED_TOP_SEGMENTS in proxy.ts`).toBe(true);
    }

    // styleguide and api live outside app/(site)/ entirely (styleguide
    // is its own top-level app/ route, and there is no app/api/ yet) —
    // a directory scan rooted at app/(site)/ can't discover either, so
    // they're asserted by hand instead.
    expect(SKIPPED_TOP_SEGMENTS.has("styleguide")).toBe(true);
    expect(SKIPPED_TOP_SEGMENTS.has("api")).toBe(true);
  });
});
