import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, SKIP_REASON, signIn, trackPageErrors } from "./helpers/admin-auth";

// F3: React hydration error #418 in the page editor. Dates were rendered with the
// runtime's default locale/time zone, so the server (UTC, en-US) and QA's browser
// (es-CO, UTC-5) produced different text. Read-only: opens existing admin screens.
test.use({ locale: "es-CO", timezoneId: "America/Bogota" });

test.describe("admin dates under a non-US browser locale and time zone", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, SKIP_REASON);

  test("page editor with revisions logs no console errors", async ({ page }) => {
    test.setTimeout(180_000);
    const errors = trackPageErrors(page);
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await page.goto("/admin/pages");
    await page.waitForLoadState("networkidle");
    await page.locator("a[href^='/admin/pages/']").first().waitFor();
    const hrefs = await page
      .locator("a[href^='/admin/pages/']")
      .evaluateAll((links) => [...new Set(links.map((a) => a.getAttribute("href")!))].filter((h) => /\/admin\/pages\/[0-9a-f-]{36}$/.test(h)));
    let withRevisions = 0;
    for (const href of hrefs.slice(0, 40)) {
      await page.goto(href);
      await page.waitForLoadState("networkidle");
      const heading = await page.getByRole("heading", { name: /version history/i }).textContent();
      if (!/\(0\)/.test(heading ?? "")) {
        withRevisions += 1;
        break;
      }
    }
    test.skip(withRevisions === 0, "No page with revisions exists to check.");
    // The revision timestamps are shown in a fixed zone, not the browser's.
    await expect(page.locator("#revisions-heading + ul li span").first()).toContainText(/\d{4}.*(AM|PM)/);
    expect(errors).toEqual([]);
  });

  for (const path of ["/admin", "/admin/pages", "/admin/forms", "/admin/shared-sections", "/admin/audit-log", "/admin/submissions", "/admin/branding"]) {
    test(`${path} logs no console errors`, async ({ page }) => {
      const errors = trackPageErrors(page);
      await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      expect(errors).toEqual([]);
    });
  }
});
