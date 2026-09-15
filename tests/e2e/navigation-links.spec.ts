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
 * Detection method — status plus <title>, not the not-found heading:
 * The proxy now returns a genuine 404 for missing routes. The title
 * check remains useful because a content route that falls back to the
 * root default title has not resolved its own page metadata correctly.
 * `body.includes("Page not found")` is not used because it is always
 * true — Next's RSC/Flight payload embeds the compiled not-found
 * boundary's serialized element tree as client-router boilerplate on
 * every page, so the substring's mere presence carries no signal.
 * Checking the post-hydration accessibility tree (page.getByRole) also
 * works for a single page, but title/status checks avoid hydrating more
 * than twenty CMS-backed routes just to verify their destination.
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

  const results = await Promise.all(hrefs.map((href) => checkHref(page, href)));

  const broken = results.filter((r) => r.broken);
  expect(broken, `Broken seeded nav links: ${JSON.stringify(broken)}`).toEqual([]);
});
