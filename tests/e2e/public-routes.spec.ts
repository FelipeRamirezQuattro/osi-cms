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
    // Asserts against the raw server-rendered response body rather than a
    // hydrated DOM locator: under `next dev` (Turbopack), this specific
    // boundary (HTTPAccessFallbackBoundary, i.e. notFound()) sometimes
    // logs "Switched to client rendering because the server rendering
    // errored: NEXT_HTTP_ERROR_FALLBACK;404" and then never finishes
    // client-rendering — the browser is left showing app/(site)/
    // loading.tsx's skeleton indefinitely, even though the actual HTML
    // Next.js served (confirmed with curl and with `next build && next
    // start`) already contains the correct not-found content. That's a
    // dev-mode/Turbopack SSR-streaming quirk, not a real defect — reading
    // the response body directly sidesteps it without weakening what's
    // actually being verified (the server sent the right content).
    const response = await page.goto("/this-page-does-not-exist");
    const body = (await response?.text()) ?? "";
    expect(body).toContain("Page not found");
  });

  // Discovered while verifying this task (not one of the plan's known
  // defects): app/(site)/[...slug]/page.tsx's notFound() call renders
  // app/(site)/not-found.tsx's content correctly, but the HTTP response
  // status is 200, not 404 — confirmed with `pnpm build && pnpm start`
  // (not just `next dev`, so it isn't a dev-only quirk) and with a plain
  // curl against the running server. That's exactly the soft-404 CLAUDE.md
  // warns about ("public 404s must not be soft-404s, so check response
  // status too"). Filed as a real, currently-failing regression via
  // test.fail() (Playwright's equivalent of Vitest's test.fails()) rather
  // than silently dropping the status assertion — see task-1-report.md
  // for the full writeup. Remove test.fail() once the route returns a
  // real 404 status.
  test("nonexistent path returns a real 404 status, not a soft-404 (known defect)", async ({ page }) => {
    test.fail();
    const response = await page.goto("/this-page-does-not-exist");
    expect(response?.status()).toBe(404);
  });
});

test.describe("not-yet-built routes (Task 8)", () => {
  // These are real plan requirements (route smoke-test matrix must cover
  // news/resources/locations/industries/applications) that don't have
  // routes yet — only a [...slug] catch-all serving `pages` rows exists
  // today. test.fixme() documents the requirement without failing the
  // suite; Task 8 should un-skip each as its route lands.

  // TODO(Task 8): un-fixme once app/(site)/news exists.
  test.fixme("news listing renders", async ({ page }) => {
    await expectRenderedSitePage(page, "/news");
  });

  // TODO(Task 8): un-fixme once app/(site)/resources exists.
  test.fixme("resources listing renders", async ({ page }) => {
    await expectRenderedSitePage(page, "/resources");
  });

  // TODO(Task 8): un-fixme once app/(site)/industries/[slug] exists.
  test.fixme("industry detail renders", async ({ page }) => {
    await expectRenderedSitePage(page, "/industries/some-slug");
  });

  // TODO(Task 8): un-fixme once app/(site)/applications/[slug] exists.
  test.fixme("application detail renders", async ({ page }) => {
    await expectRenderedSitePage(page, "/applications/some-slug");
  });

  // TODO(Task 8): un-fixme once app/(site)/locations exists.
  test.fixme("locations listing renders", async ({ page }) => {
    await expectRenderedSitePage(page, "/locations");
  });
});
