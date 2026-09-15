import { test, expect, type Page } from "@playwright/test";
import { isExternalHref } from "@/lib/routes";

/**
 * Covers the plan's broken-link bullet: "seeded internal navigation must
 * not land on the 404 page." Rather than querying nav_items directly
 * (this repo's only Supabase project is live production with no seeded
 * non-prod environment — see the ruling in the Task 1 brief against
 * authenticated/DB-privileged e2e setup), this scrapes every href the
 * real rendered header (utility nav + the "Menu" mega panel) and footer
 * actually produce from lib/data/navigation.ts's getNavMenu(), then checks
 * each one. That's a stronger check than a raw DB read anyway: it proves
 * what a visitor clicking the real nav actually gets, hrefs included.
 *
 * Detection method — checking <title>, not the not-found heading:
 * Two more direct approaches were tried first and both proved unusable:
 * (1) HTTP status is always 200 even for a route that 404s —
 *     app/(site)/[...slug]/page.tsx's notFound() has its own,
 *     separately-flagged soft-404 defect (see task-1-report.md's "New
 *     defect discovered" section).
 * (2) `body.includes("Page not found")` on the raw response is always
 *     true — Next's RSC/Flight payload embeds the compiled not-found
 *     boundary's serialized element tree as client-router boilerplate on
 *     *every* page (confirmed: exactly 2 occurrences on both a working
 *     page and a genuine 404, so the substring's mere presence carries no
 *     signal at all).
 * (3) Checking the post-hydration accessibility tree (page.getByRole) —
 *     works for a single page (public-routes.spec.ts's dedicated 404 test
 *     relies on exactly this), but sequentially visiting 20+ links this
 *     way in one browser session hit real, reproducible dev-mode
 *     Turbopack degradation: well past the halfway point, every
 *     subsequent page — including ones independently confirmed working —
 *     started reporting the not-found heading as present. Not this test's
 *     bug: isolating each check in its own fresh page didn't change it.
 *
 * What actually works: app/layout.tsx sets `title: { default: "Odessa
 * Separator Inc.", template: "%s | Odessa Separator Inc." }`. Every real
 * page's generateMetadata sets a real title, so its rendered <title>
 * always has the "X | ... | Odessa Separator Inc." shape; a route that
 * doesn't resolve (getPageBySlug returns null) returns `{}` from
 * generateMetadata, so its <title> is the bare, untemplated default with
 * no leading "X | ". That's resolved during the initial SSR response
 * itself (part of <head>), so a plain page.request.get() — no browser
 * rendering, no hydration, none of the streaming instability above —
 * is enough to check it reliably.
 */

const SITE_DEFAULT_TITLE = "Odessa Separator Inc.";

async function collectInternalHrefs(page: Page): Promise<string[]> {
  const utilityHrefs = await page
    .locator('nav[aria-label="Utility"] a[href]')
    .evaluateAll((els) => els.map((el) => el.getAttribute("href")));

  await page.getByRole("button", { name: "Menu", exact: true }).click();
  await expect(page.locator("#mega-menu-panel")).toBeVisible();
  const megaHrefs = await page
    .locator("#mega-menu-panel a[href]")
    .evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  await page.getByRole("button", { name: "Close menu" }).click();

  // The footer's four getNavMenu("footer-N") columns render as `<ul><li><a>`
  // inside the grid — scoped to that grid so the hardcoded "Services"/
  // "Get in touch"/"Find a location" ArrowButtons and social-icon <a>s
  // (not seeded nav_items) aren't swept in too.
  const footerHrefs = await page
    .locator("footer .grid a[href]")
    .evaluateAll((els) => els.map((el) => el.getAttribute("href")));

  const all = [...utilityHrefs, ...megaHrefs, ...footerHrefs].filter((href): href is string => Boolean(href));
  const internal = all.filter((href) => href.startsWith("/") && !href.startsWith("//") && !isExternalHref(href));
  return [...new Set(internal)];
}

async function checkHref(page: Page, href: string) {
  const response = await page.request.get(href);
  const body = await response.text();
  const title = body.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  const resolved = title !== "" && title !== SITE_DEFAULT_TITLE;
  const status = response.status();
  return { href, status, title, broken: !resolved || status >= 500 };
}

// Placeholder mega-menu product entries: CLAUDE.md's Known content gaps
// section is explicit that "only 3 products (Gas Release System, ESP Chem
// Screen, SRP Sand Lift) have real legacy copy; everything else in the
// mega menu is name-only" — i.e. no backing product/page row, so it 404s
// today. Expressed as a rule (any /products/{category}/{slug} whose slug
// isn't one of the 3 real ones), not a hand-maintained list of every
// placeholder name, since the real set is exactly what CLAUDE.md already
// documents and could grow as more placeholder items are added to the
// mega menu.
const REAL_PRODUCT_SLUGS = new Set(["gas-release-system", "esp-chem-screen", "srp-sand-lift"]);
function isPlaceholderProductHref(href: string): boolean {
  const match = href.match(/^\/products\/[^/]+\/([^/]+)$/);
  return match !== null && !REAL_PRODUCT_SLUGS.has(match[1]);
}

// Task 8 resolved four of the five gaps this set used to document:
// - /resources now has a real route (app/(site)/resources/page.tsx) —
//   it renders (with an empty-state message; the resources table has 0
//   rows live) regardless of DB content, so it's a genuine fix, not
//   pending anything further.
// - /what-we-do and /esp-packages were removed from scripts/
//   seed-navigation.ts entirely (no page, no product line, no content
//   anywhere backs them — inventing one would violate CLAUDE.md's "never
//   fabricate client content" rule). /industries was repointed to
//   /products (no /industries listing page exists or is planned — see
//   task-8-report.md item #5). None of these three hrefs are seeded into
//   nav_items any more, so they simply won't appear in the scrape below
//   once nav is re-seeded.
//
// /locations is the one still-open gap: app/(site)/[...slug]/page.tsx
// will serve it once a `pages` row exists, but there is no such row yet
// — scripts/seed-locations.ts (Task 8) creates one, but per this
// project's "no implementer runs a seed/publish script against the live
// project" rule it's handed to the controller to run after review, not
// run here. Remove this once that script has been run.
//
// IMPORTANT: none of the nav-side fixes above take effect on the LIVE
// site until `pnpm seed:navigation` is re-run (same live-write
// restriction) — see task-8-report.md. Until both scripts are run, this
// test and the "known gaps" test below will still see the old, broken
// live nav_items rows.
const KNOWN_BROKEN_NAV_HREFS = new Set(["/locations"]);

function isKnownGap(href: string): boolean {
  return KNOWN_BROKEN_NAV_HREFS.has(href) || isPlaceholderProductHref(href);
}

test("every seeded internal nav link (utility + mega menu + footer) resolves without hitting the 404 boundary", async ({
  page,
}) => {
  await page.goto("/");
  const hrefs = await collectInternalHrefs(page);

  // Sanity check on the scrape itself — if this is ever 0, the test isn't
  // covering anything and the failure is in the locators above, not the
  // navigation. Real seeded nav (utility + mega + footer) has always had
  // more than a couple of entries since Phase 3.
  expect(hrefs.length).toBeGreaterThan(3);

  const results = await Promise.all(hrefs.filter((h) => !isKnownGap(h)).map((href) => checkHref(page, href)));

  const broken = results.filter((r) => r.broken);
  expect(broken, `Broken seeded nav links: ${JSON.stringify(broken)}`).toEqual([]);
});

// Discovered while writing the test above (not one of the plan's two
// controller-ruled known defects) — see the comments on
// isPlaceholderProductHref/KNOWN_BROKEN_NAV_HREFS. test.fail() documents
// "these are broken today, for these exact, already-explained reasons"
// without masking regressions in every *other* nav link (the strict test
// above still fails hard for anything new).
test("known content/route gaps in seeded nav are still gaps (not fixed by this task)", async ({ page }) => {
  test.fail();
  await page.goto("/");
  const hrefs = await collectInternalHrefs(page);
  const knownGapHrefs = hrefs.filter(isKnownGap);

  // Sanity check on the scrape: if the mega menu ever stops linking to
  // any placeholder product, or the four bare-path gaps above all get
  // seeded pages, there's nothing left to assert here and this test
  // should be deleted rather than vacuously pass.
  expect(knownGapHrefs.length).toBeGreaterThan(0);

  const results = await Promise.all(knownGapHrefs.map((href) => checkHref(page, href)));

  // Written as the desired, eventually-true end state — every one of
  // these resolves — which fails today since they're all still broken;
  // test.fail() marks that as expected. Once they're all fixed, this
  // assertion passes and test.fail() flips to a hard failure — the
  // signal to shrink/remove KNOWN_BROKEN_NAV_HREFS/REAL_PRODUCT_SLUGS
  // and, eventually, this whole test.
  expect(results.filter((r) => r.broken), JSON.stringify(results)).toEqual([]);
});
