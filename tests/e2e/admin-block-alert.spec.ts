import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, SKIP_REASON, signIn } from "./helpers/admin-auth";

// A block that can't be saved yet must open a real alert dialog (not a line
// of text at the top of the page, never a browser alert). Uses a throwaway
// "PRUEBA CC" page on the database .env.local points at, and always deletes it.
test.describe("block problem alert", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, SKIP_REASON);

  test("saving an invalid Columns block opens an alert dialog with 'Go to block'", async ({ page }) => {
    test.setTimeout(120_000);
    const browserDialogs: string[] = [];
    page.on("dialog", (d) => {
      browserDialogs.push(d.message());
      void d.dismiss();
    });
    const stamp = Date.now();
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await page.goto("/admin/pages/new");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Title").fill(`PRUEBA CC alert ${stamp}`);
    await page.getByLabel("Slug").fill(`prueba-cc-alert-${stamp}`);
    await page.getByRole("button", { name: "Create page" }).click();
    await page.waitForURL(/\/admin\/pages\/[0-9a-f-]{36}$/);
    await page.waitForLoadState("networkidle");

    try {
      // Add a Columns block: it starts with 0 columns, but the schema needs 2–3.
      await page.getByPlaceholder("Search blocks by name or purpose…").fill("columns");
      await page.getByRole("button", { name: /^Columns/ }).first().click();
      await expect(page.locator("[data-block-toggle]").filter({ hasText: "Columns" })).toBeVisible();

      await page.getByRole("button", { name: "Save draft" }).click();
      const dialog = page.getByRole("alertdialog");
      await expect(dialog).toBeVisible({ timeout: 15_000 });
      await expect(dialog).toContainText("This block can't be saved yet");
      await expect(dialog).toContainText(/add at least 2 columns/i);

      await dialog.getByRole("button", { name: "Go to block" }).click();
      await expect(dialog).toBeHidden();
      await expect(page.locator("[data-block-invalid='true']")).toBeVisible();
      expect(browserDialogs).toEqual([]);
    } finally {
      await page.getByRole("button", { name: "Delete page" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
      await page.waitForURL(/\/admin\/pages$/, { timeout: 20_000 });
    }
  });
});
