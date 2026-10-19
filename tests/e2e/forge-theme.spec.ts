import { mkdir } from "node:fs/promises";
import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Forge / classic visual + accessibility sweep. Run it against a server of
 * each theme (the theme comes from OSI_LAYOUT_OVERRIDE, the same local QA
 * hook the server reads — never set on a deployed environment):
 *
 *   OSI_LAYOUT_OVERRIDE=forge   pnpm dev -p 3100   # then
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 OSI_LAYOUT_OVERRIDE=forge \
 *     pnpm exec playwright test forge-theme --project=chromium
 *
 * Screenshots land in screenshots/theme-forge/<theme>/<page>-<width>.png.
 * Every page must also be free of horizontal overflow and of axe violations
 * (any impact) at WCAG 2.1 A/AA.
 */
const THEME = process.env.OSI_LAYOUT_OVERRIDE === "forge" ? "forge" : "classic";
const WIDTHS = [390, 768, 1440] as const;
const PAGES = [
  { name: "home", path: "/" },
  { name: "products", path: "/products" },
  { name: "services", path: "/services" },
  { name: "contact", path: "/contact" },
  { name: "news", path: "/news" },
  { name: "careers", path: "/careers" },
  { name: "not-found", path: "/qa-this-page-does-not-exist", status: 404 },
] as const;

async function settle(page: Page) {
  // Walk the page so scroll-reveals fire, then return to the top and let
  // springs finish — screenshots and axe both want the settled state.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 500) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);
}

async function firstProductPath(page: Page): Promise<string> {
  await page.goto("/products");
  const href = await page.locator('a[href^="/products/"][href*="/"]').evaluateAll((links) =>
    links.map((a) => a.getAttribute("href")!).find((h) => h.split("/").length === 4),
  );
  expect(href, "the products listing should link to at least one product page").toBeTruthy();
  return href!;
}

test.describe(`${THEME} theme sweep`, () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "viewport sweep drives its own widths");
  });

  test("boundary reports the expected layout", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".public-site")).toHaveAttribute("data-theme", THEME);
  });

  for (const width of WIDTHS) {
    test(`screenshots, overflow and axe at ${width}px`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width, height: width < 500 ? 844 : 1000 });
      await mkdir(`screenshots/theme-forge/${THEME}`, { recursive: true });

      const pages = [...PAGES, { name: "product", path: await firstProductPath(page), status: 200 as number }];
      for (const entry of pages) {
        const response = await page.goto(entry.path);
        expect(response?.status(), `${entry.path} status`).toBe(("status" in entry ? entry.status : 200) ?? 200);
        await settle(page);

        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${entry.name} overflows horizontally at ${width}px`).toBeLessThanOrEqual(1);

        await page.screenshot({ path: `screenshots/theme-forge/${THEME}/${entry.name}-${width}.png`, fullPage: true });

        const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        expect(
          results.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`),
          `${entry.name} axe violations at ${width}px`,
        ).toEqual([]);
      }
    });
  }

  test("header floats translucent over the hero and turns solid after scroll (forge only)", async ({ page }) => {
    test.skip(THEME !== "forge", "forge-only behavior");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    const header = page.locator("[data-site-header]");
    const bg = () => header.evaluate((el) => getComputedStyle(el).backgroundColor);
    const top = await bg();
    await page.evaluate(() => window.scrollTo(0, 400));
    await page.waitForTimeout(500);
    await expect(header).toHaveAttribute("data-scrolled", "");
    const scrolled = await bg();
    // color-mix() computes to `color(srgb r g b / a)`; rgba() computes to `rgba(r, g, b, a)`.
    const alpha = (c: string) => Number(/[,/]\s*([\d.]+)\)$/.exec(c)?.[1] ?? 1);
    expect(alpha(top)).toBeLessThan(alpha(scrolled));
  });

  test("hero photograph is actually painted above the section background", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const hasPhoto = await page.locator("[data-hero-backdrop] img").count();
    test.skip(hasPhoto === 0, "home hero has no image in this environment");
    await page.waitForTimeout(800);
    // Hit-test stack at a point on the right of the hero, clear of the text.
    // The photo must sit ABOVE the hero <section> (whose own navy background
    // would otherwise cover it), i.e. appear earlier in the top-down list.
    const order = await page.evaluate(() => {
      const stack = document.elementsFromPoint(window.innerWidth * 0.85, window.innerHeight * 0.5);
      const hero = stack.findIndex((el) => el.matches('[data-block-type="hero_full"] > section'));
      const photo = stack.findIndex((el) => el.matches("[data-hero-backdrop] img"));
      return { hero, photo };
    });
    expect(order.photo, "photo is hit-testable").toBeGreaterThanOrEqual(0);
    expect(order.photo, "photo paints above the hero section background").toBeLessThan(order.hero);
  });

  test("reduced motion: nothing is left hidden or displaced", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await page.goto("/");
    await settle(page);
    const hidden = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("main section")].filter((el) => getComputedStyle(el).opacity === "0").length,
    );
    expect(hidden).toBe(0);
    await context.close();
  });
});
