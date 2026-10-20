import { test, expect } from "@playwright/test";

/**
 * W1 — the review build must keep itself out of search engines. These run
 * against localhost, which is never an indexable host (lib/indexing.ts), so
 * they hold whether or not SITE_INDEXABLE is set in the environment.
 */
test.describe("review build is not indexable", () => {
  test("robots.txt disallows everything and advertises no sitemap", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/User-Agent: \*/i);
    expect(body).toMatch(/Disallow: \/\s*$/m);
    expect(body).not.toMatch(/^Allow:/im);
    expect(body).not.toMatch(/Sitemap:/i);
  });

  test("sitemap.xml lists no URLs", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    expect(await res.text()).not.toContain("<loc>");
  });

  for (const path of ["/", "/products", "/search", "/this-page-does-not-exist"]) {
    test(`${path} sends X-Robots-Tag: noindex, nofollow`, async ({ request }) => {
      const res = await request.get(path);
      expect(res.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    });
  }

  test("admin responses are noindex too", async ({ request }) => {
    const res = await request.get("/admin/login");
    expect(res.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  });
});
