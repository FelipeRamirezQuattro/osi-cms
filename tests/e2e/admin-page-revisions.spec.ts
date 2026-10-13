import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, SKIP_REASON, signIn } from "./helpers/admin-auth";

// PAG-09: version history must show up — and grow — as a page is published.
// Creates a throwaway "PRUEBA CC" page on whatever database .env.local points
// at (production, today) and always removes it again, even on failure.
test.describe("page version history", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, SKIP_REASON);

  test("publishing twice lists two versions", async ({ page }) => {
    test.setTimeout(120_000);
    const stamp = Date.now();
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await page.goto("/admin/pages/new");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Title").fill(`PRUEBA CC revisions ${stamp}`);
    await page.getByLabel("Slug").fill(`prueba-cc-revisions-${stamp}`);
    await page.getByRole("button", { name: "Create page" }).click();
    await page.waitForURL(/\/admin\/pages\/[0-9a-f-]{36}$/);
    await page.waitForLoadState("networkidle");

    try {
      const history = page.getByRole("heading", { name: /version history/i });
      await expect(history).toContainText("(0)");
      await expect(page.getByText("Versions are saved each time you publish.")).toBeVisible();

      for (const expected of [1, 2]) {
        await page.getByRole("button", { name: "Publish", exact: true }).click();
        await expect(page.getByText(/^Published\./)).toBeVisible({ timeout: 30_000 });
        await expect(history).toContainText(`(${expected})`, { timeout: 15_000 });
        if (expected === 1) await page.getByRole("button", { name: "Unpublish" }).click();
        await expect(page.getByRole("button", { name: expected === 1 ? "Publish" : "Unpublish", exact: true })).toBeVisible();
      }
      await expect(page.getByRole("button", { name: "Restore" })).toHaveCount(2);
    } finally {
      // Always leave production clean: unpublish (if needed), then delete.
      const unpublish = page.getByRole("button", { name: "Unpublish", exact: true });
      if (await unpublish.isVisible().catch(() => false)) await unpublish.click();
      await page.getByRole("button", { name: "Publish", exact: true }).waitFor({ timeout: 15_000 }).catch(() => {});
      await page.getByRole("button", { name: "Delete page" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
      await page.waitForURL(/\/admin\/pages$/, { timeout: 20_000 });
    }
  });
});
