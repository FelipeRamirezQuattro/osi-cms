import { test, expect, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * Automated accessibility sweep (Task 14, brief item 9) — runs axe-core
 * against every page this plan named: the public marketing site's key
 * templates, the 404 page, the admin login page, and (credentials
 * permitting — see the "authenticated admin" describe block below) every
 * admin list/editor screen, the media dialog, and the block palette.
 *
 * Scope limited to "serious"/"critical" impact violations, matching this
 * task's acceptance criterion ("no serious/critical axe violations") —
 * "moderate"/"minor" findings exist in real, unfixed form on some of
 * these pages (see individual `test.info().annotations` notes below where
 * that's true) but aren't what this suite gates on.
 */

const SERIOUS_IMPACTS = new Set(["serious", "critical"]);

async function expectNoSeriousViolations(page: Page, testInfo: TestInfo, include?: string) {
  // CLAUDE.md's motion rules (Phases 1-2) have most page content enter via
  // RevealSection/AnimatedSection/AnimatedGroup — a real, deliberate
  // fade+rise from opacity 0 (see lib/motion/variants.ts, ~0.4s). Scanning
  // immediately after `page.goto()` resolves can catch a section mid-fade,
  // where its text is still blended toward the page background and reads
  // as a (real, but purely transient) color-contrast failure — confirmed
  // by re-reading computed styles a moment later and seeing full-opacity,
  // fully-compliant colors. This wait makes the scan reflect the page's
  // actual settled state instead of a race against Framer Motion, the
  // same way a human visitor perceives it a fraction of a second after
  // load, not the flash mid-transition.
  await page.waitForTimeout(1000);

  let builder = new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]);
  if (include) builder = builder.include(include);
  const results = await builder.analyze();
  const serious = results.violations.filter((v) => SERIOUS_IMPACTS.has(v.impact ?? ""));

  if (serious.length > 0) {
    await testInfo.attach("axe-violations", {
      body: JSON.stringify(serious, null, 2),
      contentType: "application/json",
    });
  }

  expect(
    serious.map((v) => `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} node(s)`),
    "serious/critical axe violations",
  ).toEqual([]);
}

test.describe("public site — axe", () => {
  test("home page", async ({ page }, testInfo) => {
    await page.goto("/");
    await expectNoSeriousViolations(page, testInfo);
  });

  test("products listing", async ({ page }, testInfo) => {
    await page.goto("/products");
    await expectNoSeriousViolations(page, testInfo);
  });

  test("product detail", async ({ page }, testInfo) => {
    await page.goto("/products/gas-separation/gas-release-system");
    await expectNoSeriousViolations(page, testInfo);
  });

  test("news listing", async ({ page }, testInfo) => {
    await page.goto("/news");
    await expectNoSeriousViolations(page, testInfo);
  });

  test("resources listing", async ({ page }, testInfo) => {
    await page.goto("/resources");
    await expectNoSeriousViolations(page, testInfo);
  });

  test("contact page", async ({ page }, testInfo) => {
    await page.goto("/contact");
    await expectNoSeriousViolations(page, testInfo);
  });

  test("search page", async ({ page }, testInfo) => {
    await page.goto("/search");
    await expectNoSeriousViolations(page, testInfo);
  });

  test("search page with results", async ({ page }, testInfo) => {
    await page.goto("/search?q=pump");
    await expectNoSeriousViolations(page, testInfo);
  });

  test("404 page", async ({ page }, testInfo) => {
    await page.goto("/this-page-does-not-exist");
    await expectNoSeriousViolations(page, testInfo);
  });

  test("image gallery dialog", async ({ page }, testInfo) => {
    await page.goto("/styleguide");
    const trigger = page.getByRole("button", { name: /Open image 1 of 2/ });
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "Image gallery" })).toBeVisible();
    await expectNoSeriousViolations(page, testInfo, "dialog[open]");
    await page.getByRole("button", { name: "Close gallery" }).click();
    await expect(trigger).toBeFocused();
  });

  test("product technical image dialog", async ({ page }, testInfo) => {
    await page.goto("/products/gas-separation/gas-release-system");
    const trigger = page.getByRole("button", { name: /Open Gas Release System diagram fullscreen/i });
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "Image gallery" })).toBeVisible();
    await expectNoSeriousViolations(page, testInfo, "dialog[open]");
    await page.getByRole("button", { name: "Close gallery" }).click();
    await expect(trigger).toBeFocused();
  });
});

test.describe("admin login — axe", () => {
  // The one admin screen reachable with no session — always runs, no
  // credentials required.
  test("login page", async ({ page }, testInfo) => {
    await page.goto("/admin/login");
    await expectNoSeriousViolations(page, testInfo);
  });

  test("forgot-password page", async ({ page }, testInfo) => {
    await page.goto("/admin/forgot-password");
    await expectNoSeriousViolations(page, testInfo);
  });
});

/**
 * Authenticated admin screens (dashboard, every list screen, one real
 * editor, the media dialog, the block palette) — gated on
 * ADMIN_E2E_EMAIL/ADMIN_E2E_PASSWORD because this repo's only Supabase
 * project is the live production one (Task 1 brief ruling #3: no seeded
 * non-prod environment) and there is no admin account this task is able
 * to create or already knows the password for (the sole admin account is
 * bootstrapped via `pnpm create-admin`, a mutating action against
 * production this remediation plan's implementers don't run — see
 * CLAUDE.md/docs/DECISIONS.md). Set both env vars to a real staff
 * account's credentials to actually run this block; it's a deliberate,
 * documented gap otherwise, not a silently-skipped one — see
 * docs/DECISIONS.md's Task 14 entry and task-14-report.md.
 */
const ADMIN_EMAIL = process.env.ADMIN_E2E_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_E2E_PASSWORD;

test.describe("authenticated admin — axe", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Set ADMIN_E2E_EMAIL/ADMIN_E2E_PASSWORD to run — see file header comment.");

  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator("#login-email").fill(ADMIN_EMAIL ?? "");
    await page.locator("#login-password").fill(ADMIN_PASSWORD ?? "");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("/admin");
  });

  const LIST_SCREENS: Array<[string, string]> = [
    ["dashboard", "/admin"],
    ["pages list", "/admin/pages"],
    ["products list", "/admin/products"],
    ["product categories list", "/admin/product-categories"],
    ["industries list", "/admin/industries"],
    ["applications list", "/admin/applications"],
    ["news list", "/admin/news"],
    ["resources list", "/admin/resources"],
    ["locations list", "/admin/locations"],
    ["directory list", "/admin/directory"],
    ["redirects list", "/admin/redirects"],
    ["forms list", "/admin/forms"],
    ["shared sections list", "/admin/shared-sections"],
    ["media library", "/admin/media"],
    ["users list", "/admin/users"],
    ["navigation editor", "/admin/navigation"],
    ["settings", "/admin/settings"],
    ["audit log", "/admin/audit-log"],
    ["submissions list", "/admin/submissions"],
  ];

  for (const [label, path] of LIST_SCREENS) {
    test(label, async ({ page }, testInfo) => {
      await page.goto(path);
      await expectNoSeriousViolations(page, testInfo);
    });
  }

  test("page editor (first row) and the block palette", async ({ page }, testInfo) => {
    await page.goto("/admin/pages");
    const firstRow = page.locator("table a[href^='/admin/pages/']").first();
    test.skip((await firstRow.count()) === 0, "No pages exist to open an editor for.");
    await firstRow.click();
    await page.waitForURL(/\/admin\/pages\/.+/);
    // The block palette ("Add a block") renders inline on this same
    // screen (not a separate route) — one axe pass covers both.
    await expectNoSeriousViolations(page, testInfo);
  });

  test("media picker dialog", async ({ page }, testInfo) => {
    await page.goto("/admin/pages");
    const firstRow = page.locator("table a[href^='/admin/pages/']").first();
    test.skip((await firstRow.count()) === 0, "No pages exist to open an editor for.");
    await firstRow.click();
    await page.waitForURL(/\/admin\/pages\/.+/);

    const pickerButton = page.getByRole("button", { name: /^(Choose|Change) /i }).first();
    test.skip((await pickerButton.count()) === 0, "No image field on this page to open the media picker from.");
    await pickerButton.click();
    const dialog = page.locator("dialog[open]");
    await expect(dialog).toBeVisible();
    await expectNoSeriousViolations(page, testInfo, "dialog[open]");
  });
});
