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

  test("product discovery state is URL-backed and restored by browser history", async ({ page }) => {
    await page.goto("/products");
    const discovery = page.locator("main");
    await discovery.getByRole("button", { name: "Industries", exact: true }).click();
    await expect(page).toHaveURL(/\/products\?view=industries$/);
    await expect(discovery.getByRole("button", { name: "Industries", exact: true })).toHaveAttribute("aria-pressed", "true");

    await discovery.getByRole("button", { name: "Applications", exact: true }).click();
    await expect(page).toHaveURL(/\/products\?view=applications$/);
    await page.goBack();
    await expect(page).toHaveURL(/\/products\?view=industries$/);
    await expect(discovery.getByRole("button", { name: "Industries", exact: true })).toHaveAttribute("aria-pressed", "true");
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
    await expect(page.getByRole("heading", { level: 1, name: "Find products, resources, and expertise" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Search OSI" })).toBeVisible();
  });

  test("search page with a query renders results or a no-results message", async ({ page }) => {
    await expectRenderedSitePage(page, "/search?q=pump");
    await expect(page.getByRole("heading", { level: 1, name: "Find products, resources, and expertise" })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Search OSI" })).toHaveValue("pump");
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

test.describe("Phase 9 routes (blog + newsletter)", () => {
  // Renders unconditionally (empty state while there are no published blog
  // posts), and blog detail pages are left for when there's real content —
  // same reasoning as the industry/application detail fixmes below.
  test("blog listing renders", async ({ page }) => {
    await expectRenderedSitePage(page, "/blog");
    await expect(page.getByRole("heading", { level: 1, name: "Blog" })).toBeVisible();
  });

  test("blog listing with an unknown tag shows the empty state, not an error", async ({ page }) => {
    await expectRenderedSitePage(page, "/blog?tag=no-such-tag");
    await expect(page.getByText(/No articles tagged/)).toBeVisible();
  });

  // The confirm/unsubscribe pages only act on a button press, so a bad or
  // missing token must show the explanation and offer NO action control at
  // all (and must never be indexed).
  for (const path of ["/newsletter/confirm", "/newsletter/unsubscribe", "/newsletter/confirm?token=forged"]) {
    test(`${path} with no valid token explains the problem and offers no action`, async ({ page }) => {
      await expectRenderedSitePage(page, path);
      await expect(page.getByText("This link isn't valid")).toBeVisible();
      await expect(page.locator("main button[type='submit']")).toHaveCount(0);
      await expect(page.locator("meta[name='robots']")).toHaveAttribute("content", /noindex/);
    });
  }

  test("the one-click unsubscribe endpoint rejects a request with no valid token", async ({ request }) => {
    const response = await request.post("/api/newsletter/unsubscribe?token=forged");
    expect(response.status()).toBe(400);
  });

  test("opening the unsubscribe endpoint in a browser (GET) redirects instead of changing anything", async ({ request }) => {
    const response = await request.get("/api/newsletter/unsubscribe?token=forged", { maxRedirects: 0 });
    expect(response.status()).toBe(303);
    expect(response.headers()["location"]).toContain("/newsletter/unsubscribe");
  });

  test("the admin newsletter screens require a sign-in", async ({ page }) => {
    for (const path of ["/admin/newsletter/subscribers", "/admin/newsletter/campaigns"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login/);
    }
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

  // /locations is served by the existing [...slug] catch-all. The live
  // page now exists, so this is a normal regression assertion rather than
  // the expected-failure placeholder retained during CMS remediation.
  test("locations listing renders", async ({ page }) => {
    await expectRenderedSitePage(page, "/locations");
  });
});
