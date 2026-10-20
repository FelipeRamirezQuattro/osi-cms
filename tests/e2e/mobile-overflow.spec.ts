import { expect, test } from "@playwright/test";

// F1: QA saw content wider than the viewport on a 440px phone. Checks the
// document's scroll width AND every element's right/left edge (an element can
// stick out inside an overflow-hidden ancestor on one page and not another),
// at the five phone widths QA and the common devices use, in mobile emulation
// (where an overflowing page widens the layout viewport instead of scrolling).
const WIDTHS = [360, 390, 414, 430, 440];
const PATHS = ["/", "/about-us", "/careers", "/hse", "/contact", "/news", "/resources", "/products", "/services", "/esto-no-existe"];

test.use({ isMobile: true, hasTouch: true });

for (const width of WIDTHS) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width, height: 900 });
    const problems: string[] = [];
    for (const path of PATHS) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const report = await page.evaluate((w) => {
        const stuck: string[] = [];
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 || (r.right <= w + 1 && r.left >= -1)) continue;
          if (r.right < -1000) continue; // the off-screen honeypot field
          let clipped = false;
          for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
            if (getComputedStyle(a).overflowX !== "visible") { clipped = true; break; }
          }
          if (!clipped) stuck.push(`${el.tagName.toLowerCase()}.${String(el.className).split(/\s+/).slice(0, 3).join(".")} [${Math.round(r.left)}..${Math.round(r.right)}]`);
        }
        return { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, stuck: stuck.slice(0, 5) };
      }, width);
      if (report.scrollWidth > width || report.innerWidth !== width || report.stuck.length) problems.push(`${path}: ${JSON.stringify(report)}`);
    }
    // The open mobile menu is its own full-screen layer.
    await page.goto("/about-us");
    await page.getByRole("button", { name: /menu/i }).first().click();
    const menu = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
    if (menu.scrollWidth > width || menu.innerWidth !== width) problems.push(`open menu: ${JSON.stringify(menu)}`);
    expect(problems).toEqual([]);
  });
}
