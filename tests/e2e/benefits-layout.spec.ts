import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Product Benefits/Features grid (design pass #1). Runs in whichever layout the
 * server was started with (OSI_LAYOUT_OVERRIDE=forge|classic, see forge-theme.spec.ts).
 * Uses the published products so no sign-in is needed: 6, 4 and 3 items.
 */
const PRODUCTS = [
  { path: "/products/gas-separation/gas-release-system", items: 6 },
  { path: "/products/pumps/esp-chem-screen", items: 4 },
  { path: "/products/sand-control/srp-sand-lift", items: 3 },
];
const WIDTHS = [1440, 768, 390, 320];
const SECTION = '[data-block-type="benefits_cards"] > section';

async function open(page: Page, path: string, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(path, { waitUntil: "networkidle" });
  await page.locator(SECTION).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200); // the stagger entrance
}

for (const product of PRODUCTS) {
  test.describe(product.path, () => {
    for (const width of WIDTHS) {
      test(`${width}px: one text style, no orphan row, no overflow, whole borders`, async ({ page }) => {
        await open(page, product.path, width);

        const report = await page.evaluate((sel) => {
          const section = document.querySelector(sel)!;
          const sectionOverflow = (root: Element) =>
            Math.max(0, ...[...root.querySelectorAll("*")].map((el) => Math.round(el.getBoundingClientRect().right - window.innerWidth)));
          const cells = [...section.querySelectorAll("ul > li > div > div")] as HTMLElement[];
          const texts = cells.map((c) => c.querySelector("p") as HTMLElement);
          const style = (el: HTMLElement) => {
            const s = getComputedStyle(el);
            return [s.fontFamily, s.fontSize, s.fontWeight, s.textTransform, s.letterSpacing].join("|");
          };
          const tops = cells.map((c) => Math.round(c.getBoundingClientRect().top));
          const lastTop = Math.max(...tops);
          return {
            count: cells.length,
            styles: [...new Set(texts.map(style))],
            lastRow: tops.filter((t) => t === lastTop).length,
            rows: new Set(tops).size,
            clip: [...new Set(cells.map((c) => getComputedStyle(c).clipPath))],
            borders: [...new Set(cells.map((c) => getComputedStyle(c).borderTopWidth + getComputedStyle(c).borderRightWidth + getComputedStyle(c).borderBottomWidth + getComputedStyle(c).borderLeftWidth))],
            multiColumn: new Set(tops).size < cells.length,
            overflow: sectionOverflow(section),
            cellOverflow: cells.filter((c) => c.scrollWidth > c.clientWidth + 1).length,
            headings: section.querySelectorAll("h3").length,
          };
        }, SECTION);

        expect(report.count).toBe(product.items);
        expect(report.styles, "every item shares one text style").toHaveLength(1);
        expect(report.styles[0]).toContain("none"); // never uppercased
        expect(report.headings, "items are sentences, not titles").toBe(0);
        if (report.multiColumn) expect(report.lastRow, "no card alone on the last row").toBeGreaterThan(1);
        expect(report.clip, "cells are not clipped (no broken border)").toEqual(["none"]);
        expect(report.borders).toEqual(["1px1px1px1px"]);
        expect(report.overflow).toBeLessThanOrEqual(0);
        expect(report.cellOverflow).toBe(0);
      });
    }

    test("320px at 200% text: reflows and wraps without horizontal scroll", async ({ page }) => {
      await open(page, product.path, 320);
      await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
      await page.waitForTimeout(200);
      const overflow = await page.evaluate((sel) => {
        const section = document.querySelector(sel)!;
        return Math.max(0, ...[...section.querySelectorAll("*")].map((el) => Math.round(el.getBoundingClientRect().right - window.innerWidth)));
      }, SECTION);
      expect(overflow, "nothing in the section sticks out past the viewport").toBeLessThanOrEqual(0);
    });

    test("axe: no serious or critical violations in the section", async ({ page }, testInfo) => {
      await open(page, product.path, 1440);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .include(SECTION)
        .analyze();
      const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      if (serious.length) await testInfo.attach("axe", { body: JSON.stringify(serious, null, 2), contentType: "application/json" });
      expect(serious).toEqual([]);
    });
  });
}
