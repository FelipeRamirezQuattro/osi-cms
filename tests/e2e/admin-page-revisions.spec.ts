import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, SKIP_REASON, signIn } from "./helpers/admin-auth";

// PAG-09 / C2: version history must be visible without scrolling, grow as a page
// is published, and Restore must ask first and then replace the content.
// Creates a throwaway "PRUEBA CC" page on whatever database .env.local points
// at (production, today) and always removes it again, even on failure.
test.describe("page version history", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, SKIP_REASON);

  test("is visible up front, lists versions per publish, and Restore replaces the content", async ({ page }, testInfo) => {
    test.setTimeout(180_000);
    // Desktop project runs at the 1440px width QA uses; the mobile project keeps its 390px phone viewport.
    if (testInfo.project.name === "chromium") await page.setViewportSize({ width: 1440, height: 900 });
    const stamp = Date.now();
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await page.goto("/admin/pages/new");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Title").fill(`PRUEBA CC revisions ${stamp}`);
    await page.getByLabel("Slug").fill(`prueba-cc-revisions-${stamp}`);
    await page.getByRole("button", { name: "Create page" }).click();
    await page.waitForURL(/\/admin\/pages\/[0-9a-f-]{36}$/);
    await page.waitForLoadState("networkidle");

    const publish = page.getByRole("button", { name: "Publish", exact: true });
    const unpublish = page.getByRole("button", { name: "Unpublish", exact: true });
    try {
      const history = page.getByRole("heading", { name: /version history/i });
      await expect(history).toContainText("(0)");
      await expect(page.getByText("Versions are saved each time you publish.")).toBeVisible();
      // C2: on screen on load — no scrolling (at 390px it sits right above the blocks).
      await expect(history).toBeInViewport();

      // Publish → unpublish → add a block → publish: two versions, the newest with the block.
      await publish.click();
      await expect(page.getByText(/^Published\./)).toBeVisible({ timeout: 30_000 });
      await expect(history).toContainText("(1)", { timeout: 15_000 });
      await unpublish.click();
      await expect(publish).toBeVisible();

      await page.getByPlaceholder("Search blocks by name or purpose…").fill("rich text");
      await page.getByRole("button", { name: /^Rich text/ }).first().click();
      await expect(page.locator("[data-block-toggle]")).toHaveCount(1);
      await publish.click();
      await expect(unpublish).toBeVisible({ timeout: 30_000 });
      await expect(history).toContainText("(2)", { timeout: 15_000 });
      await expect(page.getByRole("button", { name: "Restore", exact: true })).toHaveCount(2);

      // Restore the oldest version (listed last): confirm first, then the block is gone.
      await page.getByRole("button", { name: "Restore", exact: true }).last().click();
      const confirm = page.getByRole("dialog");
      await expect(confirm).toContainText("Restore this revision?");
      await confirm.getByRole("button", { name: "Restore", exact: true }).click();
      await page.waitForLoadState("networkidle");
      await expect(page.locator("[data-block-toggle]")).toHaveCount(0, { timeout: 20_000 });
    } finally {
      // Always leave production clean: unpublish (if needed), then delete.
      if (await unpublish.isVisible().catch(() => false)) await unpublish.click();
      await publish.waitFor({ timeout: 15_000 }).catch(() => {});
      await page.getByRole("button", { name: "Delete page" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
      await page.waitForURL(/\/admin\/pages$/, { timeout: 20_000 });
    }
  });
});
