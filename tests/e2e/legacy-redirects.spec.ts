import { expect, test } from "@playwright/test";

/**
 * Legacy Wix URLs must answer with a real HTTP redirect (status + Location) from
 * proxy.ts, before any page renders — not a 200 with a client-side 308, which
 * search engines read as a normal page. Reads the live `redirects` table; never
 * writes. Run against a production build (`pnpm build && pnpm start`, with
 * PLAYWRIGHT_BASE_URL) since streaming behaviour differs in `next dev`.
 */
async function manual(request: import("@playwright/test").APIRequestContext, path: string, method: "GET" | "HEAD" = "GET") {
  const res = await request.fetch(path, { method, maxRedirects: 0 });
  const location = res.headers()["location"];
  const url = location ? new URL(location, "http://localhost") : null;
  return { status: res.status(), to: url ? url.pathname + url.search : null };
}

test.describe("legacy redirects are server-side", () => {
  const cases: [string, string][] = [
    ["/services-4", "/services"],
    ["/gasreleasesystem", "/products/gas-separation/gas-release-system"],
    ["/osi-esp-guardian-shield", "/products/chemical-treatment/g-force-esp-packer-type-gas-separator"],
  ];

  for (const [from, to] of cases) {
    test(`${from} -> 301 ${to}`, async ({ request }) => {
      expect(await manual(request, from)).toEqual({ status: 301, to });
    });
  }

  test("the query string is preserved", async ({ request }) => {
    expect(await manual(request, "/services-4?utm_source=wix&a=1")).toEqual({
      status: 301,
      to: "/services?utm_source=wix&a=1",
    });
  });

  test("HEAD gets the same redirect", async ({ request }) => {
    expect(await manual(request, "/services-4", "HEAD")).toEqual({ status: 301, to: "/services" });
  });

  test("a different case still matches", async ({ request }) => {
    expect(await manual(request, "/Services-4")).toEqual({ status: 301, to: "/services" });
  });

  test("a trailing slash is first canonicalised by Next itself (308), then redirected", async ({ request }) => {
    const first = await manual(request, "/services-4/");
    expect(first).toEqual({ status: 308, to: "/services-4" });
    expect(await manual(request, first.to!)).toEqual({ status: 301, to: "/services" });
  });

  test("a path with no redirect is not redirected", async ({ request }) => {
    const res = await manual(request, "/this-page-does-not-exist-xyz");
    expect(res.status).toBe(404);
    expect(res.to).toBeNull();
  });

  test("a real page is not redirected", async ({ request }) => {
    expect((await manual(request, "/about-us")).status).toBe(200);
  });
});
