import { mkdir } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const themes = ["forge", "vector", "horizon", "fieldwork", "signal"] as const;
const reviewSizes = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
] as const;

test.describe("OSI theme showcase", () => {
  test("gallery links to every direction", async ({ page }) => {
    const response = await page.goto("/theme-showcase");
    expect(response?.ok()).toBe(true);

    for (const theme of themes) {
      await expect(page.locator(`a[href='/${theme}']`).first()).toBeVisible();
    }
  });

  for (const size of reviewSizes) {
    test(`${size.name} routes render without horizontal overflow`, async ({ page }) => {
      await page.setViewportSize(size);

      for (const theme of themes) {
        const response = await page.goto(`/${theme}`);
        expect(response?.ok(), `${theme} should return a successful response`).toBe(true);
        await expect(page.locator("h1")).toBeVisible();

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${theme} should not overflow at ${size.width}px`).toBeLessThanOrEqual(1);
      }
    });
  }

  test("keyboard focus is visible and skip navigation works", async ({ page }) => {
    await page.goto("/signal");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Compare", exact: true })).toBeFocused();

    const outlineWidth = await page.getByRole("link", { name: "Compare", exact: true }).evaluate((element) => getComputedStyle(element).outlineWidth);
    expect(Number.parseFloat(outlineWidth)).toBeGreaterThanOrEqual(2);

    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main-content")).toBeFocused();
  });

  test("every direction applies its motion profile and reveals on scroll", async ({ page }) => {
    for (const theme of themes) {
      await page.goto(`/${theme}`);
      await expect(page.locator("[data-motion='hero']")).toHaveCount(1);
      await expect(page.locator(".theme-motion-progress")).toHaveAttribute("data-theme", theme);

      const firstSection = page.locator("[data-motion='section']").first();
      await expect(firstSection).toHaveCSS("opacity", "0");
      await firstSection.scrollIntoViewIfNeeded();
      await expect.poll(async () => Number.parseFloat(await firstSection.evaluate((element) => getComputedStyle(element).opacity))).toBeGreaterThan(0.99);
    }
  });

  test("routes have no serious or critical automated accessibility violations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const route of ["/theme-showcase", ...themes.map((theme) => `/${theme}`)]) {
      await page.goto(route);
      await page.waitForTimeout(250);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      const serious = results.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical");
      expect(serious.map((violation) => `${route}: ${violation.id} (${violation.nodes.length})`)).toEqual([]);
    }
  });

  test("capture desktop and mobile theme review images", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "Capture one canonical browser set only.");
    const outputDirectory = "prototypes/osi-theme-showcase/screenshots";
    await mkdir(outputDirectory, { recursive: true });
    await page.emulateMedia({ reducedMotion: "reduce" });

    for (const theme of themes) {
      for (const size of [reviewSizes[0], reviewSizes[2]]) {
        await page.setViewportSize(size);
        await page.goto(`/${theme}`);
        await page.waitForTimeout(250);
        await page.screenshot({ path: `${outputDirectory}/${theme}-${size.name}.png`, fullPage: true });
      }
    }
  });
});
