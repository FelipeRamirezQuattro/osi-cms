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

  test("the Rajdhani display face is preloaded for forge and never for classic", async ({ page }) => {
    await page.goto("/");
    const fontPreloads = await page.locator('link[rel="preload"][as="font"]').evaluateAll((links) =>
      links.map((l) => l.getAttribute("href")),
    );
    if (THEME === "forge") expect(fontPreloads).toContain("/fonts/rajdhani-700-latin.woff2");
    else expect(fontPreloads).toEqual([]);
    // The flight payload must not hint the font to classic either.
    const html = await (await page.request.get("/")).text();
    expect(html.includes("rajdhani-700-latin.woff2")).toBe(THEME === "forge");
  });

  test("numbering: only section_heading titles carry a section number (forge only)", async ({ page }) => {
    test.skip(THEME !== "forge", "forge-only behavior");
    for (const path of ["/", await firstProductPath(page)]) {
      await page.goto(path);
      const rows = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>("main h2")].map((h) => ({
          text: h.textContent?.trim().slice(0, 40),
          block: h.closest("[data-block-type]")?.getAttribute("data-block-type") ?? "(none)",
          // counter() serialises without digits, so test for "has generated content at all".
          numbered: !["none", "normal"].includes(getComputedStyle(h, "::before").content),
        })),
      );
      for (const row of rows) {
        expect(row.numbered, `${path}: "${row.text}" in ${row.block}`).toBe(row.block === "section_heading");
      }
    }
  });

  test("sentences are never set in the uppercase display face (forge only)", async ({ page }) => {
    test.skip(THEME !== "forge", "forge-only behavior");
    for (const path of ["/", await firstProductPath(page)]) {
      await page.goto(path);
      const offenders = await page.evaluate(() => {
        const words = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;
        return [...document.querySelectorAll<HTMLElement>("main h1, main h2, main h3")]
          .filter((h) => words(h.textContent ?? "") > 6)
          .filter((h) => getComputedStyle(h).textTransform === "uppercase" || /rajdhani/i.test(getComputedStyle(h).fontFamily.split(",")[0] ?? ""))
          .map((h) => `${h.tagName} "${h.textContent?.trim().slice(0, 50)}"`);
      });
      expect(offenders, `${path}: long headings still in the display face`).toEqual([]);
      // ...and a title-length heading still is uppercase Rajdhani.
      const short = await page.evaluate(() => {
        const h = [...document.querySelectorAll<HTMLElement>("main h1")][0];
        return h ? getComputedStyle(h).textTransform : null;
      });
      expect(short).toBe("uppercase");
    }
  });

  test("product hero: the CTA bar, the viewer's fullscreen label and the media frame stay clear", async ({ page }) => {
    const path = await firstProductPath(page);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await page.waitForTimeout(600);
      const r = await page.evaluate(() => {
        const rect = (el: Element | null) => {
          if (!el) return null;
          const b = el.getBoundingClientRect();
          return { x: b.x, y: b.y + window.scrollY, w: b.width, h: b.height };
        };
        const hero = document.querySelector('[data-block-type="product_hero"]');
        return {
          cta: rect([...(hero?.querySelectorAll("a") ?? [])].find((a) => /distributor/i.test(a.textContent ?? "")) ?? null),
          label: rect(hero?.querySelector("[data-viewer-label]") ?? null),
          frame: rect(hero?.querySelector('button[aria-label^="Open"]') ?? null),
        };
      });
      test.skip(!r.frame, "first product has no diagram image");
      const gap = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
        Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
      expect(r.cta, `CTA bar at ${width}px`).not.toBeNull();
      expect(gap(r.cta!, r.label!), `CTA bar vs fullscreen label at ${width}px`).toBeGreaterThanOrEqual(16);
      expect(gap(r.cta!, r.frame!), `CTA bar vs media frame at ${width}px`).toBeGreaterThanOrEqual(8);
    }
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
