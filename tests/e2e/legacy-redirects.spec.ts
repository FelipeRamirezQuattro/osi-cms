import { expect, test } from "@playwright/test";
import { resolveRedirectTarget, type RedirectIndexRow } from "@/lib/redirects/resolver";

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
    // A draft product: 301 to its category's product list until it is published (migration 0053).
    ["/osi-esp-guardian-shield", "/products?category=chemical-treatment"],
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

test.describe("redirects that target a product or page by id (0052-0054)", () => {
  test("a draft product's redirect is a 301 to its category's product list", async ({ request }) => {
    // /esp-sand-lift -> product esp-sand-lift (a draft in chemical-treatment). Once OSI publishes it this
    // becomes /products/chemical-treatment/esp-sand-lift — update this expectation then.
    expect(await manual(request, "/esp-sand-lift")).toEqual({ status: 301, to: "/products?category=chemical-treatment" });
  });

  test("a draft page's redirect is a 301 to its fallback path", async ({ request }) => {
    expect(await manual(request, "/webinars")).toEqual({ status: 301, to: "/news" });
    expect(await manual(request, "/wellbore-diagrams")).toEqual({ status: 301, to: "/resources" });
    expect(await manual(request, "/case-study")).toEqual({ status: 301, to: "/services" });
  });

  test("every row in `redirects`: stored status + the resolved Location, and the destination is not a 404", async ({ request }) => {
    test.setTimeout(180_000);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    test.skip(!url || !key, "Needs NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY (.env.local) to read the redirect table.");
    const rpc = await fetch(`${url}/rest/v1/rpc/redirect_index`, {
      method: "POST",
      headers: { apikey: key!, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: "{}",
    });
    expect(rpc.status, "redirect_index() RPC (migration 0052) must be applied").toBe(200);
    const rows = (await rpc.json()) as RedirectIndexRow[];
    expect(rows.length).toBeGreaterThanOrEqual(90);

    const problems: string[] = [];
    for (const row of rows) {
      const expected = resolveRedirectTarget(row);
      const hop = await manual(request, row.from_path);
      if (hop.status === 200) {
        // A published CMS page at the same path legitimately wins over its redirect row.
        continue;
      }
      if (hop.status !== row.status_code || hop.to !== expected) {
        problems.push(`${row.from_path}: got ${hop.status} -> ${hop.to}, expected ${row.status_code} -> ${expected}`);
        continue;
      }
      // The destination must be a real page: a 200 with a page-specific <title>.
      // (An unresolved route renders the untemplated default title, even when it streams a 200.)
      const res = await request.get(expected);
      const title = /<title>([^<]*)<\/title>/.exec(await res.text())?.[1] ?? "";
      if (res.status() !== 200 || (expected !== "/" && title === "Odessa Separator Inc.")) {
        problems.push(`${row.from_path} -> ${expected}: destination is ${res.status()} "${title}" (looks like a 404)`);
      }
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
