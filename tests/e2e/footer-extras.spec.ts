import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Footer links + certification badges (site_settings.footer_utility_links / footer_badges, migration 0060).
 * The live settings are empty until OSI fills them, so the row is exercised on the /styleguide fixture,
 * which renders the same FooterExtras component the footer uses.
 */
for (const width of [1440, 390, 320]) {
  test(`${width}px: named links, badge alt text, no overflow, axe-clean`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/styleguide", { waitUntil: "networkidle" });
    const box = page.locator("[data-styleguide-footer-extras]");
    await box.scrollIntoViewIfNeeded();

    const links = box.getByRole("list", { name: "Footer links" });
    await expect(links.getByRole("link", { name: "SG-SST Policies" })).toHaveAttribute("href", "/hse/sg-sst-policies");
    const elearning = links.getByRole("link", { name: "E-learning" });
    await expect(elearning).toHaveAttribute("target", "_blank");
    await expect(elearning).toHaveAttribute("rel", /noopener/);

    const badges = box.getByRole("list", { name: "Certifications" });
    await expect(badges.getByRole("img", { name: /ISO 9001/ })).toBeVisible();
    await expect(badges.getByRole("link", { name: /ISO 45001/ })).toHaveAttribute("href", "https://www.sgs.com/es-co");

    // Touch targets of at least 44px and nothing wider than the viewport.
    for (const link of await links.getByRole("link").all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    const right = await box.evaluate((el) => Math.max(...[...el.querySelectorAll("*")].map((n) => n.getBoundingClientRect().right)) - window.innerWidth);
    expect(right).toBeLessThanOrEqual(0);

    const results = await new AxeBuilder({ page }).include("[data-styleguide-footer-extras]").analyze();
    expect(results.violations).toEqual([]);
  });
}

// QA (Entregable 7): "the SG-SST Policies link doesn't work". Click the real footer link from several pages (the live settings carry it).
for (const from of ["/", "/about-us", "/products", "/services/machine-shop", "/hse"]) {
  test(`footer SG-SST Policies link opens the policy page from ${from}`, async ({ page }) => {
    await page.goto(from, { waitUntil: "networkidle" });
    const link = page.locator("footer").getByRole("list", { name: "Footer links" }).getByRole("link", { name: "SG-SST Policies" });
    await link.scrollIntoViewIfNeeded();
    await expect(link).toHaveAttribute("href", "/hse/sg-sst-policies");
    await link.click();
    await page.waitForURL("**/hse/sg-sst-policies");
    await expect(page.getByRole("heading", { level: 1, name: "SG-SST Policies" })).toBeVisible();
  });
}

test("footer badges render in full colour (no filter)", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const filters = await page
    .locator("footer")
    .getByRole("list", { name: "Certifications" })
    .locator("img")
    .evaluateAll((imgs) => imgs.map((i) => getComputedStyle(i).filter));
  expect(filters.length).toBeGreaterThan(0);
  for (const f of filters) expect(f).toBe("none");
});
