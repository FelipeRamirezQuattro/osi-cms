import { test, expect, type Page } from "@playwright/test";

/**
 * Read-only, unauthenticated public-route smoke matrix — per the Task 1
 * brief's ruling #3, this repo's only Supabase project is live production
 * (no seeded non-prod environment), so Playwright coverage here is
 * deliberately limited to routes that don't require a session: no login
 * flow, no admin/editor workflows (those are covered at the Server Action
 * level by lib/actions/pages.test.ts instead).
 *
 * Every route under app/(site)/ is wrapped by SiteLayout with a <header>
 * and <footer> (see app/(site)/layout.tsx, components/layout/header.tsx,
 * components/layout/footer.tsx) — that structural chrome, plus a non-empty
 * <title>, is the one signal every content-driven route can be asserted on
 * without hardcoding page copy that a real content edit could break.
 * app/(site)/not-found.tsx (what notFound() renders) is the one exception:
 * it renders OUTSIDE that chrome-optional assumption being tested (its own
 * <h1>Page not found</h1>), which is exactly what the 404 test asserts
 * IS present, everywhere else asserts is NOT present.
 */

async function expectRenderedSitePage(page: Page, path: string) {
  const response = await page.goto(path);
  expect(response?.status(), `${path} should respond 200`).toBe(200);
  await expect(page.locator("header")).toBeVisible();
  await expect(page.locator("footer")).toBeVisible();
  await expect(page).toHaveTitle(/.+/);
  // A soft-404 would still return 200 while rendering the not-found
  // boundary's content — guard against that explicitly, not just status.
  await expect(page.getByRole("heading", { name: "Page not found" })).toHaveCount(0);
}

test.describe("public route smoke matrix", () => {
  test("home page renders with site chrome", async ({ page }) => {
    await expectRenderedSitePage(page, "/");
  });

  test("products listing renders with site chrome", async ({ page }) => {
    await expectRenderedSitePage(page, "/products");
  });

  test("product detail: gas release system", async ({ page }) => {
    await expectRenderedSitePage(page, "/products/gas-separation/gas-release-system");
  });

  test("product detail: ESP chem screen", async ({ page }) => {
    await expectRenderedSitePage(page, "/products/pumps/esp-chem-screen");
  });

  test("product detail: SRP sand lift", async ({ page }) => {
    await expectRenderedSitePage(page, "/products/sand-control/srp-sand-lift");
  });

  test("contact page renders with site chrome", async ({ page }) => {
    await expectRenderedSitePage(page, "/contact");
  });

  test("search page renders its own heading and result form", async ({ page }) => {
    await expectRenderedSitePage(page, "/search");
    await expect(page.getByRole("heading", { level: 1, name: "Search" })).toBeVisible();
  });

  test("search page with a query renders results or a no-results message", async ({ page }) => {
    await expectRenderedSitePage(page, "/search?q=pump");
    await expect(page.getByRole("heading", { level: 1, name: "Search" })).toBeVisible();
  });

  test("generic CMS page (about-us) renders through the catch-all route", async ({ page }) => {
    await expectRenderedSitePage(page, "/about-us");
  });

  test("nested generic CMS page (careers/hiring) renders through the catch-all route", async ({ page }) => {
    await expectRenderedSitePage(page, "/careers/hiring");
  });

  test("careers listing renders through the catch-all route", async ({ page }) => {
    await expectRenderedSitePage(page, "/careers");
  });

  test("directory renders through the catch-all route", async ({ page }) => {
    await expectRenderedSitePage(page, "/directory");
  });

  test("services listing renders through the catch-all route", async ({ page }) => {
    await expectRenderedSitePage(page, "/services");
  });

  test("hse renders through the catch-all route", async ({ page }) => {
    await expectRenderedSitePage(page, "/hse");
  });

  test("hse/sg-sst-policies renders through the catch-all route (genuinely Spanish-language legal content, not a bug — see CLAUDE.md)", async ({
    page,
  }) => {
    await expectRenderedSitePage(page, "/hse/sg-sst-policies");
  });

  test("nonexistent path renders the not-found boundary content", async ({ page }) => {
    // Asserts against the raw server-rendered response body, not a
    // hydrated DOM locator — see the dedicated chrome test below for
    // that. As of Task 8, this request is rewritten by proxy.ts to
    // app/(site-404)/system-not-found (see that file's top comment) — a
    // route group with zero Suspense boundaries anywhere in its tree,
    // which is what fixes the status code (the test right after this
    // one), but also means Next's own notFound() machinery
    // (HTTPAccessFallbackBoundary) has no boundary to server-swap
    // content into and falls back to a minimal `id="__next_error__"`
    // shell whose actual content ships as an RSC payload for the client
    // to hydrate (confirmed on a maximally trivial synthetic route too,
    // in a real `next build && next start` server — NOT the dev-mode-
    // only Turbopack quirk an earlier version of this comment assumed
    // the equivalent behavior on the old, Suspense-wrapped code path
    // was). "Page not found" is still present as a literal substring of
    // that raw response body (it's serialized inline in the flight
    // payload), so this assertion still holds without needing to wait
    // for hydration.
    const response = await page.goto("/this-page-does-not-exist");
    const body = (await response?.text()) ?? "";
    expect(body).toContain("Page not found");
  });

  // Fixed in Task 8 — see proxy.ts's top comment for the root cause
  // (app/(site)/loading.tsx's ambient Suspense boundary makes the
  // response start streaming as 200 before [...slug]/page.tsx's
  // notFound() ever runs) and the fix (a proxy-level rewrite to a
  // loading.tsx-free sibling route group, so nothing can commit 200
  // before its own notFound() call runs). Previously filed as a known
  // defect via test.fail() (see git history) — now a normal, must-pass
  // assertion.
  test("nonexistent path returns a real 404 status, not a soft-404", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
  });

  // Task 8 review fix: the genuine-404 fix above preserves the on-brand
  // Header/Footer chrome, but (per the previous test's comment) only via
  // client hydration, not in the raw response body — this is the test
  // that actually confirms a real visitor sees it, using Playwright's
  // locators (which wait for hydration) rather than the raw body.
  test("nonexistent path shows the real site chrome once hydrated", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });
});

test.describe("Task 8 routes", () => {
  // app/(site)/news/page.tsx now exists — renders unconditionally
  // (empty-state copy when news_posts has no published rows, which is
  // true live right now; see task-8-report.md).
  test("news listing renders", async ({ page }) => {
    await expectRenderedSitePage(page, "/news");
  });

  // app/(site)/resources/page.tsx now exists — same reasoning, renders
  // regardless of the resources table's content (0 rows live).
  test("resources listing renders", async ({ page }) => {
    await expectRenderedSitePage(page, "/resources");
  });

  // app/(site)/industries/[slug] and app/(site)/applications/[slug] now
  // exist as routes, but every industry row live is status='draft' and
  // the applications table has zero rows at all (confirmed via read-only
  // query — see task-8-report.md) — a genuine content gap (CLAUDE.md
  // "never fabricate client content" bars seeding a fake published one
  // just to exercise this test), not a routing gap. Left as fixme rather
  // than pointed at a slug that can only ever 404 today; un-fixme with a
  // real published slug once the client provides industry/application
  // copy to publish.
  test.fixme("industry detail renders", async ({ page }) => {
    await expectRenderedSitePage(page, "/industries/some-slug");
  });

  test.fixme("application detail renders", async ({ page }) => {
    await expectRenderedSitePage(page, "/applications/some-slug");
  });

  // /locations is served by the existing [...slug] catch-all (no new
  // route file needed — same mechanism as /directory), but the `pages`
  // row scripts/seed-locations.ts creates hasn't been run against the
  // live project yet (this plan's implementers never run seed/publish
  // scripts against the only environment — see task-8-report.md).
  // test.fail() documents the intended end state without masking a
  // regression in the rest of this file; flip to a plain test() once the
  // controller runs `pnpm seed:locations`.
  test("locations listing renders (pending scripts/seed-locations.ts being run)", async ({ page }) => {
    test.fail();
    await expectRenderedSitePage(page, "/locations");
  });
});
