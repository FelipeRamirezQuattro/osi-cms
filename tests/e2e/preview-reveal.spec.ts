import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, SKIP_REASON, signIn } from "./helpers/admin-auth";

// QA (Entregable 7): "the preview of the Contact draft shows none of the directory". The blocks were all there, but
// below-the-fold sections only fade in once scrolled to, so a capture that never scrolls saw blank space.
// The staff preview shows every block at once.
test.describe("staff preview", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, SKIP_REASON);

  test("shows every block without scrolling, including the contact directory", async ({ page }) => {
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    const response = await page.goto("/preview/contact", { waitUntil: "networkidle" });
    test.skip(response?.status() === 404, "No contact page to preview in this database.");
    const sections = page.locator("[data-staff-preview] [data-block-type] > section");
    expect(await sections.count()).toBeGreaterThan(1);
    for (const section of await sections.all()) await expect(section).toHaveCSS("opacity", "1");
    const cards = page.locator("[data-block-type=people_cards] li");
    if ((await cards.count()) > 0) await expect(cards.first()).toBeVisible();
  });
});
