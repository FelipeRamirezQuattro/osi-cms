import { expect, test } from "@playwright/test";

/**
 * Menu entries for products are linked by identity (nav_items.product_id) and
 * only render while the product is published. Public-only: this never publishes
 * or edits anything.
 *
 * KNOWN_DRAFT_LABELS are mega-menu items whose products were drafts at hand-off
 * (Oct 18); once OSI publishes one, move it to PUBLISHED_LABELS. The 404 check
 * below holds whatever gets published.
 */
const KNOWN_DRAFT_LABELS = ["Super Perf", "Tubing Screen", "The Nozzle", "Dip Tube Bypass", "Well Shockstick"];
const PUBLISHED_LABELS = ["SRP Sand Lift", "Gas Release System", "ESP Chem Screen"];

test.describe("products in the menu", () => {
  test("a draft product's link is hidden, published ones show, and none lead to a 404", async ({ page, request }) => {
    await page.goto("/");
    const panel = page.locator("#mega-menu-panel");
    const productLinks = await panel
      .locator('nav[aria-label="Product and resource menu"] a[href^="/products/"]')
      .evaluateAll((as) => as.map((a) => ({ label: (a.textContent ?? "").trim(), href: (a as HTMLAnchorElement).getAttribute("href")! })));
    const labels = productLinks.map((l) => l.label);

    for (const draft of KNOWN_DRAFT_LABELS) expect(labels.some((l) => l.startsWith(draft)), `${draft} is a draft`).toBe(false);
    for (const live of PUBLISHED_LABELS) expect(labels.some((l) => l.startsWith(live)), `${live} is published`).toBe(true);

    for (const { href } of productLinks) {
      const response = await request.get(href);
      expect(response.status(), href).toBe(200);
    }
  });

  test("the top-bar 'Products' entry opens the products menu", async ({ page, viewport }) => {
    test.skip((viewport?.width ?? 0) < 1024, "the utility bar is desktop-only; phones use the Menu button");
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // past hydration
    const products = page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Products" });
    await products.click();
    await expect(page).toHaveURL(/\/$/); // opened the dialog, did not navigate
    await expect(page.locator("#mega-menu-panel")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sand Control" })).toBeVisible();
  });
});
