import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * W4 — site search. Finds published products by name and by a word from
 * their summary, finds pages and news, never returns drafts, shows a useful
 * empty state, and survives hostile input. Read-only (the search page logs
 * each query to analytics_search_queries, as it does for any visitor).
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function rest<T>(request: APIRequestContext, query: string, key = ANON_KEY): Promise<T[]> {
  // New-format secret keys (sb_secret_...) are not JWTs and must not be sent as a Bearer token.
  // Supabase also refuses a secret key from a request that looks like a browser, hence the explicit User-Agent.
  const headers: Record<string, string> = key?.startsWith("sb_")
    ? { apikey: key, "user-agent": "osi-e2e-readonly" }
    : { apikey: key!, Authorization: `Bearer ${key}` };
  const res = await request.get(`${SUPABASE_URL}/rest/v1/${query}`, { headers });
  expect(res.ok(), `read ${query}`).toBe(true);
  return res.json();
}

const STOP = new Set(["which", "their", "there", "these", "those", "about", "would", "could", "other", "where", "while", "using", "within", "without"]);

test.describe("site search", () => {
  test.skip(!SUPABASE_URL || !ANON_KEY, "Needs NEXT_PUBLIC_SUPABASE_URL/ANON_KEY (.env.local).");

  test("finds a published product by its name", async ({ page, request }) => {
    const [product] = await rest<{ name: string; slug: string; product_categories: { slug: string } }>(request, "products?select=name,slug,product_categories(slug)&status=eq.published&limit=1");
    test.skip(!product, "No published product.");
    await page.goto(`/search?q=${encodeURIComponent(product.name)}`);
    await expect(page.getByRole("link", { name: new RegExp(product.name, "i") }).first()).toBeVisible();
    await expect(page.locator(`main a[href="/products/${product.product_categories.slug}/${product.slug}"]`).first()).toBeVisible();
  });

  test("finds a published product by a word from its summary", async ({ page, request }) => {
    const products = await rest<{ name: string; slug: string; summary: string | null; product_categories: { slug: string } }>(request, "products?select=name,slug,summary,product_categories(slug)&status=eq.published");
    const product = products.find((p) => (p.summary ?? "").length > 40);
    test.skip(!product, "No published product with a summary.");
    const words = (product!.summary ?? "").toLowerCase().match(/[a-z]{6,}/g) ?? [];
    const nameWords = new Set(product!.name.toLowerCase().split(/\W+/));
    // A word that appears in this product's summary but not in its name, so the hit proves the summary is searched.
    const word = words.find((w) => !STOP.has(w) && !nameWords.has(w));
    test.skip(!word, "No distinctive summary word.");
    await page.goto(`/search?q=${encodeURIComponent(word!)}`);
    await expect(page.locator(`main a[href="/products/${product!.product_categories.slug}/${product!.slug}"]`).first()).toBeVisible();
  });

  test("finds a published page", async ({ page, request }) => {
    const pages = await rest<{ slug: string; snapshot: { meta: { title: string } } }>(request, "page_publications?select=slug,snapshot&slug=neq.home");
    const target = pages.sort((a, b) => b.snapshot.meta.title.length - a.snapshot.meta.title.length)[0];
    await page.goto(`/search?q=${encodeURIComponent(target.snapshot.meta.title)}`);
    await expect(page.locator(`main a[href="/${target.slug}"]`).first()).toBeVisible();
  });

  test("finds a published news post", async ({ page, request }) => {
    const [post] = await rest<{ title: string; slug: string; kind: string }>(request, "news_posts?select=title,slug,kind&status=eq.published&limit=1");
    test.skip(!post, "No published news or blog post yet.");
    await page.goto(`/search?q=${encodeURIComponent(post.title)}`);
    await expect(page.locator(`main a[href$="/${post.slug}"]`).first()).toBeVisible();
  });

  test("never returns a draft product", async ({ page, request }) => {
    test.skip(!SERVICE_KEY, "Needs SUPABASE_SERVICE_ROLE_KEY to look up a draft (read-only).");
    const drafts = await rest<{ name: string; slug: string }>(request, "products?select=name,slug&status=eq.draft&limit=5", SERVICE_KEY);
    test.skip(drafts.length === 0, "No draft products.");
    for (const draft of drafts) {
      await page.goto(`/search?q=${encodeURIComponent(draft.name)}`);
      await expect(page.locator(`main a[href$="/${draft.slug}"]`)).toHaveCount(0);
    }
  });

  test("a query with no matches explains itself and offers a way forward", async ({ page }) => {
    await page.goto("/search?q=zzzqxv-no-such-thing");
    await expect(page.getByRole("heading", { name: "No results found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Explore products" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Contact us" })).toBeVisible();
  });

  test("an empty query shows the starting prompt", async ({ page }) => {
    await page.goto("/search");
    await expect(page.getByRole("heading", { name: "Start with a product or topic" })).toBeVisible();
  });

  const hostile: [string, string][] = [
    ["a lone percent sign", "%"],
    ["percent and underscore wildcards", "%_%"],
    ["an apostrophe", "O'Brien"],
    ["quotes and backslashes", `"quoted" \\ back\\slash`],
    ["tsquery operators", "a & b | !c (d) :* <-> e"],
    ["a NUL byte", "gas%00release"],
    ["markup", "<img src=x onerror=alert(1)>"],
    ["unicode", "café ñandú 排水"],
    ["a 5000-character string", "x".repeat(5000)],
  ];
  for (const [label, query] of hostile) {
    test(`does not error on ${label}`, async ({ page }) => {
      const response = await page.goto(`/search?q=${encodeURIComponent(query)}`);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toContainText("Find products");
      await expect(page.getByText(/application error|something went wrong/i)).toHaveCount(0);
      // Typed markup is shown as text, never parsed.
      await expect(page.locator('img[src="x"]')).toHaveCount(0);
    });
  }

  test("a bare % is a literal, not a wildcard that matches everything", async ({ page }) => {
    await page.goto("/search?q=%25");
    await expect(page.getByRole("heading", { name: "No results found" })).toBeVisible();
  });
});
