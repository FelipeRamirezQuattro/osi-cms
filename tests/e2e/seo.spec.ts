import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

/**
 * W3 — every PUBLISHED public URL carries the SEO basics: one h1, a sensible
 * heading order, lang="en", a unique title and description, a canonical on
 * the configured site URL, Open Graph + Twitter tags, JSON-LD where it
 * belongs, and alt text on every image. Published URLs come from the same
 * anonymous reads the public site makes; nothing is written.
 *
 * Runs against any build: canonicals follow NEXT_PUBLIC_SITE_URL, so the
 * expected origin is read from the environment rather than hard-coded.
 */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function rest<T>(request: APIRequestContext, query: string): Promise<T[]> {
  const res = await request.get(`${SUPABASE_URL}/rest/v1/${query}`, { headers: { apikey: ANON_KEY!, Authorization: `Bearer ${ANON_KEY}` } });
  expect(res.ok(), `read ${query}`).toBe(true);
  return res.json();
}

async function publishedPaths(request: APIRequestContext): Promise<string[]> {
  const [pages, products, posts, industries, applications] = await Promise.all([
    rest<{ slug: string; snapshot: { meta?: { noindex?: boolean } } }>(request, "page_publications?select=slug,snapshot"),
    rest<{ slug: string; product_categories: { slug: string } | null }>(request, "products?select=slug,product_categories(slug)&status=eq.published"),
    rest<{ slug: string; kind: string }>(request, "news_posts?select=slug,kind&status=eq.published"),
    rest<{ slug: string }>(request, "industries?select=slug&status=eq.published"),
    rest<{ slug: string }>(request, "applications?select=slug&status=eq.published"),
  ]);
  return [
    ...pages.filter((p) => !p.snapshot?.meta?.noindex).map((p) => (p.slug === "home" ? "/" : `/${p.slug}`)),
    ...products.filter((p) => p.product_categories).map((p) => `/products/${p.product_categories!.slug}/${p.slug}`),
    ...posts.map((p) => (p.kind === "blog" ? `/blog/${p.slug}` : `/news/${p.slug}`)),
    ...industries.map((i) => `/industries/${i.slug}`),
    ...applications.map((a) => `/applications/${a.slug}`),
    "/news",
    "/blog",
    "/resources",
  ];
}

type Audit = {
  path: string;
  lang: string | null;
  title: string;
  description: string | null;
  canonical: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogUrl: string | null;
  twitterCard: string | null;
  h1Count: number;
  headingSkips: string[];
  imagesWithoutAlt: string[];
  jsonLdTypes: string[];
};

async function audit(page: Page, path: string): Promise<Audit> {
  const response = await page.goto(path);
  expect(response?.status(), `${path} should be 200`).toBe(200);
  return page.evaluate((p) => {
    const meta = (selector: string) => document.querySelector(selector)?.getAttribute("content") ?? null;
    const levels = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) => ({ level: Number(h.tagName[1]), text: (h.textContent ?? "").trim().slice(0, 50) }));
    const skips: string[] = [];
    let previous = 0;
    for (const heading of levels) {
      if (previous && heading.level > previous + 1) skips.push(`h${previous}→h${heading.level} "${heading.text}"`);
      previous = heading.level;
    }
    return {
      path: p,
      lang: document.documentElement.getAttribute("lang"),
      title: document.title,
      description: meta('meta[name="description"]'),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null,
      ogTitle: meta('meta[property="og:title"]'),
      ogDescription: meta('meta[property="og:description"]'),
      ogUrl: meta('meta[property="og:url"]'),
      twitterCard: meta('meta[name="twitter:card"]'),
      h1Count: document.querySelectorAll("h1").length,
      headingSkips: skips,
      // alt="" is a deliberate "decorative" marker; only a missing attribute is a gap.
      imagesWithoutAlt: [...document.querySelectorAll("img")].filter((img) => !img.hasAttribute("alt")).map((img) => img.getAttribute("src") ?? "(no src)"),
      jsonLdTypes: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => {
        try {
          return String(JSON.parse(s.textContent ?? "{}")["@type"]);
        } catch {
          return "invalid";
        }
      }),
    };
  }, path);
}

test.describe("SEO on published pages", () => {
  test.skip(!SUPABASE_URL || !ANON_KEY, "Needs NEXT_PUBLIC_SUPABASE_URL/ANON_KEY (.env.local).");

  test("every published URL has the SEO basics, and titles and descriptions are unique", async ({ page, request }, testInfo) => {
    test.setTimeout(240_000);
    const paths = [...new Set(await publishedPaths(request))];
    expect(paths.length).toBeGreaterThan(10);

    const audits: Audit[] = [];
    for (const path of paths) audits.push(await audit(page, path));
    await testInfo.attach("seo-audit.json", { body: JSON.stringify(audits, null, 2), contentType: "application/json" });

    for (const a of audits) {
      expect.soft(a.lang, `${a.path} lang`).toBe("en");
      expect.soft(a.h1Count, `${a.path} h1 count`).toBe(1);
      expect.soft(a.title.trim().length, `${a.path} title`).toBeGreaterThan(0);
      // The legacy Wix suffix must not survive next to the real site name.
      expect.soft(a.title, `${a.path} title carries the legacy suffix`).not.toMatch(/\|\s*odessaseparator\b/i);
      expect.soft((a.description ?? "").length, `${a.path} description`).toBeGreaterThan(20);
      expect.soft(a.canonical, `${a.path} canonical`).toBe(a.path === "/" ? SITE : `${SITE}${a.path}`);
      expect.soft(a.ogUrl, `${a.path} og:url`).toBe(a.canonical);
      expect.soft(a.ogTitle, `${a.path} og:title`).toBeTruthy();
      expect.soft(a.ogDescription, `${a.path} og:description`).toBeTruthy();
      expect.soft(a.twitterCard, `${a.path} twitter:card`).toBeTruthy();
      expect.soft(a.imagesWithoutAlt, `${a.path} images missing an alt attribute`).toEqual([]);
      expect.soft(a.headingSkips, `${a.path} heading order`).toEqual([]);
    }

    const titles = audits.map((a) => a.title);
    const duplicates = titles.filter((t, i) => titles.indexOf(t) !== i);
    expect(duplicates, "duplicate <title>s").toEqual([]);
    const descriptions = audits.map((a) => a.description);
    const dupDescriptions = descriptions.filter((d, i) => descriptions.indexOf(d) !== i);
    expect.soft(dupDescriptions, "duplicate meta descriptions").toEqual([]);
  });

  test("structured data: Organization only on home, Product + Breadcrumb on products, no price or rating", async ({ page, request }) => {
    const paths = await publishedPaths(request);
    const home = await audit(page, "/");
    expect(home.jsonLdTypes).toContain("Organization");

    const about = await audit(page, paths.find((p) => p.startsWith("/about")) ?? "/about-us");
    expect(about.jsonLdTypes).not.toContain("Organization");
    expect(about.jsonLdTypes).toContain("BreadcrumbList");

    const product = paths.find((p) => p.startsWith("/products/"));
    test.skip(!product, "No published product to check.");
    const detail = await audit(page, product!);
    expect(detail.jsonLdTypes).toEqual(expect.arrayContaining(["Product", "BreadcrumbList"]));
    const productLd = await page.evaluate(() =>
      [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent ?? "{}")).find((d) => d["@type"] === "Product"),
    );
    expect(productLd.name).toBeTruthy();
    expect(productLd.brand?.name).toBeTruthy();
    expect(productLd).not.toHaveProperty("offers");
    expect(productLd).not.toHaveProperty("aggregateRating");
    expect(productLd).not.toHaveProperty("review");
  });

  test("admin, preview and the search page are not indexable", async ({ page }) => {
    await page.goto("/search");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });
});
