import { expect, test, type APIRequestContext } from "@playwright/test";

/**
 * W4 — OSI has supplied no 3D model, so the built-in viewer must not appear
 * anywhere on the public site. Checks the data (no published page or product
 * carries an `ar_model` block) and the rendered pages (no <model-viewer>, no
 * "View in AR"). `products.model_3d_url` is NOT asserted empty: esp-chem-screen
 * and gas-release-system keep their external Worldcast links from the Wix
 * site ("See this tool in 3D"); the last test checks those open in a new tab.
 * Replace the viewer checks with a positive test the day OSI supplies a model.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function rest<T>(request: APIRequestContext, query: string): Promise<T[]> {
  const res = await request.get(`${SUPABASE_URL}/rest/v1/${query}`, { headers: { apikey: ANON_KEY!, Authorization: `Bearer ${ANON_KEY}` } });
  expect(res.ok(), `read ${query}`).toBe(true);
  return res.json();
}

test.describe("3D/AR viewer stays hidden until OSI supplies a model", () => {
  test.skip(!SUPABASE_URL || !ANON_KEY, "Needs NEXT_PUBLIC_SUPABASE_URL/ANON_KEY (.env.local).");

  test("no published content carries an ar_model block", async ({ request }) => {
    const publications = await rest<{ slug: string; snapshot: { blocks: { type: string }[] } }>(request, "page_publications?select=slug,snapshot");
    const pagesWithModel = publications.filter((p) => p.snapshot.blocks.some((b) => b.type === "ar_model")).map((p) => p.slug);
    expect(pagesWithModel).toEqual([]);

    const productBlocks = await rest<{ type: string }>(request, "product_blocks?select=type&type=eq.ar_model");
    expect(productBlocks).toEqual([]);
  });

  test("no public page renders a viewer", async ({ page, request }) => {
    test.setTimeout(180_000); // one navigation per published page; slow when the full suite runs alongside
    const [pages, products] = await Promise.all([
      rest<{ slug: string }>(request, "page_publications?select=slug"),
      rest<{ slug: string; product_categories: { slug: string } | null }>(request, "products?select=slug,product_categories(slug)&status=eq.published"),
    ]);
    const paths = [
      ...pages.map((p) => (p.slug === "home" ? "/" : `/${p.slug}`)),
      ...products.filter((p) => p.product_categories).map((p) => `/products/${p.product_categories!.slug}/${p.slug}`),
    ];
    for (const path of paths) {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      await expect(page.locator("model-viewer"), path).toHaveCount(0);
      await expect(page.getByText("View in AR"), path).toHaveCount(0);
    }
  });

  for (const path of ["/products/gas-separation/gas-release-system", "/products/pumps/esp-chem-screen"]) {
    test(`${path}: the 3D button is an external link that opens in a new tab`, async ({ page }) => {
      await page.goto(path, { waitUntil: "domcontentloaded" });
      const link = page.getByRole("link", { name: /see this tool in 3d/i });
      await expect(link).toHaveCount(1);
      await expect(link).toHaveAttribute("href", /^https?:\/\//);
      expect(new URL((await link.getAttribute("href"))!).origin).not.toBe(new URL(page.url()).origin);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
      await expect(page.locator("model-viewer")).toHaveCount(0);
    });
  }
});
