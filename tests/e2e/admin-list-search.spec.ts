import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, SKIP_REASON, signIn, trackPageErrors } from "./helpers/admin-auth";

// Regression for ACC-07 / MOD-01/02/03 / RED-01: typing in a list's search
// box used to lose characters (URL echo overwrote the draft) and re-render
// the server page on every commit. Run against `pnpm build && pnpm start`.
test.describe("admin list search", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, SKIP_REASON);

  for (const path of ["/admin/redirects", "/admin/news"]) {
    test(`${path}: keeps every typed character and survives sort changes`, async ({ page }) => {
      await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
      await page.goto(path);
      await page.waitForLoadState("networkidle"); // let React hydrate before typing
      // Tracked only from here: WebKit reports the login action's fetch, cancelled by the post-login redirect, as "Load failed".
      const errors = trackPageErrors(page);

      const search = page.locator('input[inputmode="search"]');
      await search.pressSequentially("redirects", { delay: 30 });
      await expect(search).toHaveValue("redirects");
      await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe("redirects");
      await page.waitForTimeout(600); // let any late echo land
      await expect(search).toHaveValue("redirects");

      const sort = page.getByLabel("Sort");
      const values = await sort.locator("option").evaluateAll((o) => (o as HTMLOptionElement[]).map((x) => x.value));
      for (let i = 0; i < 5; i++) {
        await sort.selectOption(values[i % values.length]);
      }
      await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
      expect(errors.filter((e) => !/favicon/.test(e))).toEqual([]);
    });
  }
});
