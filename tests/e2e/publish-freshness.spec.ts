import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, SKIP_REASON, signIn } from "./helpers/admin-auth";

// QA (Entregable 7): editing a published page and publishing again did not
// reach the public URL until the page was unpublished and published once more
// — the editor offered no "publish" button for a live page at all. Creates a
// throwaway "PRUEBA CC" page, always removes it again.
test.describe("publishing refreshes the public page", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, SKIP_REASON);

  test("a published page can be edited and republished, and the first public load shows the change", async ({ page }) => {
    test.setTimeout(180_000);
    const stamp = Date.now();
    const slug = `prueba-cc-fresh-${stamp}`;
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await page.goto("/admin/pages/new", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Title").fill(`PRUEBA CC fresh ${stamp}`);
    await page.getByLabel("Slug").fill(slug);
    await page.getByRole("button", { name: "Create page" }).click();
    await page.waitForURL(/\/admin\/pages\/[0-9a-f-]{36}$/);
    await page.waitForLoadState("networkidle");

    const publish = page.getByRole("button", { name: "Publish", exact: true });
    const republish = page.getByRole("button", { name: "Publish changes", exact: true });
    const unpublish = page.getByRole("button", { name: "Unpublish", exact: true });
    try {
      await page.getByPlaceholder("Search blocks by name or purpose…").fill("CTA band");
      await page.getByRole("button", { name: /^CTA band/ }).first().click();
      await expect(page.locator("[data-block-toggle]")).toHaveCount(1);
      await page.getByLabel("Headline").fill(`PRUEBA CC first ${stamp}`);
      await publish.click();
      await expect(unpublish).toBeVisible({ timeout: 30_000 });

      await page.goto(`/${slug}`);
      await expect(page.getByRole("heading", { name: `PRUEBA CC first ${stamp}` })).toBeVisible();

      // Edit the live page and publish again — no Unpublish in between.
      await page.goBack();
      await page.waitForLoadState("networkidle");
      await page.getByLabel("Headline").fill(`PRUEBA CC second ${stamp}`);
      await expect(republish).toBeVisible();
      await republish.click();
      await expect(page.getByText(/^Published\./)).toBeVisible({ timeout: 30_000 });
      await expect(unpublish).toBeVisible();

      await page.goto(`/${slug}`);
      await expect(page.getByRole("heading", { name: `PRUEBA CC second ${stamp}` })).toBeVisible();
      await expect(page.getByText(`PRUEBA CC first ${stamp}`)).toHaveCount(0);
    } finally {
      await page.goto("/admin/pages", { waitUntil: "domcontentloaded" });
      await page.getByText(`PRUEBA CC fresh ${stamp}`).first().click().catch(() => {});
      await page.waitForURL(/\/admin\/pages\/[0-9a-f-]{36}$/, { timeout: 10_000 }).catch(() => {});
      if (await unpublish.isVisible().catch(() => false)) await unpublish.click();
      await publish.waitFor({ timeout: 15_000 }).catch(() => {});
      await page.getByRole("button", { name: "Delete page" }).click();
      await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
      await page.waitForURL(/\/admin\/pages$/, { timeout: 20_000 });
    }
  });
});
