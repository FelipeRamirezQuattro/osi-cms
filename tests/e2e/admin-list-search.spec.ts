import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, SKIP_REASON, signIn, trackPageErrors } from "./helpers/admin-auth";

// Search on admin lists must (1) keep every typed character (ACC-07/MOD-01..03/RED-01) AND
// (2) actually FILTER the rows. The first fix only asserted (1); in production the URL and the
// input updated but useSearchParams never did, so nothing filtered ("search doesn't work").
const LISTS = [
  "/admin/pages",
  "/admin/products",
  "/admin/news",
  "/admin/resources",
  "/admin/redirects",
  "/admin/industries",
  "/admin/applications",
  "/admin/locations",
  "/admin/directory",
  "/admin/product-categories",
  "/admin/newsletter/subscribers",
];

const resultCount = async (page: Page) => {
  const text = await page.getByText(/^\d+ results?$/).first().innerText();
  return Number(text.match(/\d+/)![0]);
};

test.describe("admin list search", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, SKIP_REASON);

  for (const path of LISTS) {
    test(`${path}: keeps every character and filters the rows`, async ({ page }) => {
      await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
      await page.goto(path);
      await page.waitForLoadState("networkidle"); // let React hydrate before typing
      const errors = trackPageErrors(page);

      const search = page.locator('input[type="search"], input[inputmode="search"]').first();
      const total = await resultCount(page);

      // 1. Nonsense matches nothing — and the typed value survives intact.
      await search.pressSequentially("zzzxqq", { delay: 30 });
      await expect(search).toHaveValue("zzzxqq");
      await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("zzzxqq");
      await expect.poll(() => resultCount(page), { message: "results should drop to 0" }).toBe(0);

      // 2. Clearing brings everything back.
      await search.fill("");
      await expect.poll(() => resultCount(page)).toBe(total);

      // 3. A real term from the first row narrows (or keeps) the list but never loses that row.
      if (total > 0) {
        const firstRow = (await page.locator("tbody tr").first().innerText()).replace(/\s+/g, " ");
        const term = firstRow.split(" ").find((w) => /^[A-Za-z]{4,}$/.test(w));
        if (term) {
          await search.fill("");
          await search.pressSequentially(term, { delay: 30 });
          await expect(search).toHaveValue(term);
          await expect.poll(() => resultCount(page)).toBeGreaterThan(0);
          await expect.poll(() => resultCount(page)).toBeLessThanOrEqual(total);
        }
      }

      await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
      expect(errors.filter((e) => !/favicon/.test(e))).toEqual([]);
    });
  }
});
