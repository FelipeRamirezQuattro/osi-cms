import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, SKIP_REASON, signIn } from "./helpers/admin-auth";

// CAL-02: the editors must be usable at 390px — no sideways page scroll.
// Screenshots land in test-results/ for QA review.
test.describe("admin editors at 390px", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, SKIP_REASON);
  test.use({ viewport: { width: 390, height: 844 } });

  async function expectNoHorizontalScroll(page: import("@playwright/test").Page) {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, "page scrolls sideways").toBeLessThanOrEqual(0);
  }

  test("page editor, with the first block open", async ({ page }, testInfo) => {
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await page.goto("/admin/pages");
    await page.waitForLoadState("networkidle");
    await page.locator('a[href^="/admin/pages/"]:not([href$="/new"])').first().click();
    await page.waitForURL(/\/admin\/pages\/[0-9a-f-]{36}/);
    await page.locator("[data-block-toggle]").first().click();
    await expectNoHorizontalScroll(page);
    await page.screenshot({ path: testInfo.outputPath("page-editor-390.png"), fullPage: true });
  });

  test("an entity editor", async ({ page }, testInfo) => {
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await page.goto("/admin/industries");
    await page.waitForLoadState("networkidle");
    await page.locator('a[href^="/admin/industries/"]:not([href$="/new"])').first().click();
    await page.waitForURL(/\/admin\/industries\/[^/]+$/);
    await page.getByRole("button", { name: /save/i }).first().waitFor({ state: "visible" }); // past the loading skeleton
    await page.waitForLoadState("networkidle");
    await expectNoHorizontalScroll(page);
    await page.screenshot({ path: testInfo.outputPath("entity-editor-390.png"), fullPage: true });
  });
});
