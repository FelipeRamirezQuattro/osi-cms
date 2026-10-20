import { expect, test, type Page } from "@playwright/test";

// WCAG 1.4.10 (reflow, 320px) and 1.4.4 (resize text, 200%) are covered below with
// the same measurement. F1: QA saw content wider than the viewport on a 440px phone. Checks the
// document's scroll width AND every element's right/left edge (an element can
// stick out inside an overflow-hidden ancestor on one page and not another),
// at the five phone widths QA and the common devices use, in mobile emulation
// (where an overflowing page widens the layout viewport instead of scrolling).
const WIDTHS = [360, 390, 414, 430, 440];
const PATHS = ["/", "/about-us", "/careers", "/hse", "/contact", "/news", "/resources", "/products", "/services", "/esto-no-existe"];

test.use({ isMobile: true, hasTouch: true });

async function measure(page: Page, width: number) {
  return page.evaluate((w) => {
    const stuck: string[] = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || (r.right <= w + 1 && r.left >= -1)) continue;
      if (r.right < -1000) continue; // the off-screen honeypot field
      let clipped = false;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        if (/auto|scroll/.test(getComputedStyle(a).overflowX)) { clipped = true; break; }
      }
      if (!clipped) stuck.push(`${el.tagName.toLowerCase()}.${String(el.className).split(/\s+/).slice(0, 3).join(".")} [${Math.round(r.left)}..${Math.round(r.right)}]`);
    }
    return { scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth, stuck: stuck.slice(0, 5) };
  }, width);
}

type Report = Awaited<ReturnType<typeof measure>>;
const overflows = (r: Report, width: number) => r.scrollWidth > width || r.innerWidth !== width || r.stuck.length > 0;

/** Every page, then the open menu, at one viewport (optionally with text enlarged to 200%). */
async function sweep(page: Page, width: number, height: number, paths: string[], textZoom = false) {
  await page.setViewportSize({ width, height });
  const problems: string[] = [];
  const enlarge = async () => {
    if (textZoom) await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  };
  for (const path of paths) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await enlarge();
    const report = await measure(page, width);
    if (overflows(report, width)) problems.push(`${path}: ${JSON.stringify(report)}`);
  }
  // The open mobile menu is its own full-screen layer.
  await page.goto("/about-us");
  await page.waitForLoadState("networkidle");
  await enlarge();
  await page.getByRole("button", { name: /menu/i }).first().click();
  const menu = await measure(page, width);
  const dialog = await page.locator("#mega-menu-panel").evaluate((el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
  if (overflows(menu, width) || dialog.scrollWidth > dialog.clientWidth) problems.push(`open menu: ${JSON.stringify({ menu, dialog })}`);
  return problems;
}

for (const width of WIDTHS) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    test.setTimeout(180_000);
    expect(await sweep(page, width, 900, PATHS)).toEqual([]);
  });
}

test("reflows at 320x640 without horizontal scrolling (WCAG 1.4.10)", async ({ page }) => {
  test.setTimeout(180_000);
  expect(await sweep(page, 320, 640, PATHS)).toEqual([]);
});

test("text at 200% does not overflow a 390px screen (WCAG 1.4.4)", async ({ page }) => {
  test.setTimeout(180_000);
  expect(await sweep(page, 390, 844, PATHS, true)).toEqual([]);
});
