import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, signIn } from "./helpers/admin-auth";

/**
 * W4 — analytics records page views for public pages only, filters bots, and
 * stores nothing beyond three first-party cookies. The beacon POSTs to
 * /api/analytics/collect; a recorded event answers 204 AND sets the cookies,
 * an ignored one answers 204 with none. Test rows are tagged PRUEBA CC in the
 * path so they can be told apart in the analytics tables.
 */
const COLLECT = "/api/analytics/collect";
const HUMAN_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15";
// The endpoint rate-limits per IP hash (300 writes / 10 min) and a whole e2e run
// easily exceeds that from one address, so each test presents its own
// (documentation-range) address in x-forwarded-for.
const uniqueIp = () => `203.0.113.${Math.floor(Math.random() * 250) + 1}`;
const pageview = (path: string) => ({ type: "pageview", path, referrer: null, utmSource: null, utmMedium: null, utmCampaign: null });

test.describe("analytics beacon", () => {
  test("a public page sends a page view for its own path", async ({ page }) => {
    // sendBeacon bodies are invisible to request.postData(), so record them where they are made.
    await page.addInitScript(() => {
      const original = navigator.sendBeacon.bind(navigator);
      const w = window as unknown as { __beacons: string[] };
      w.__beacons = [];
      navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
        if (data instanceof Blob) void data.text().then((text) => w.__beacons.push(`${url} ${text}`));
        return original(url, data);
      };
    });
    await page.goto("/about-us");
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __beacons: string[] }).__beacons))
      .toEqual([expect.stringContaining(COLLECT)]);
    const [entry] = await page.evaluate(() => (window as unknown as { __beacons: string[] }).__beacons);
    expect(JSON.parse(entry.slice(entry.indexOf(" ") + 1))).toMatchObject({ type: "pageview", path: "/about-us" });
  });

  test("admin screens send nothing", async ({ page }) => {
    const sent: string[] = [];
    page.on("request", (r) => r.url().endsWith(COLLECT) && sent.push(r.url()));
    await page.goto("/admin/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    expect(sent).toEqual([]);
  });

  test("staff preview sends nothing", async ({ page }) => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Set E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD in .env.local.");
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    const sent: string[] = [];
    page.on("request", (r) => r.url().endsWith(COLLECT) && sent.push(r.url()));
    await page.goto("/preview/about-us");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    expect(sent).toEqual([]);
  });
});

test.describe("collect endpoint", () => {
  test("records a real visitor: 204 plus the three first-party cookies, all httpOnly", async ({ playwright, baseURL }) => {
    const api = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "user-agent": HUMAN_UA, "x-forwarded-for": uniqueIp() } });
    const res = await api.post(COLLECT, { data: pageview("/prueba-cc-analytics") });
    expect(res.status()).toBe(204);
    const cookies = (await api.storageState()).cookies;
    expect(cookies.map((c) => c.name).sort()).toEqual(["osi_attr", "osi_sid", "osi_vid"]);
    expect(cookies.every((c) => c.httpOnly)).toBe(true);
    await api.dispose();
  });

  for (const [label, ua] of [
    ["Googlebot", "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"],
    ["an AI crawler", "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.1; +https://openai.com/gptbot)"],
    ["a generic crawler", "SomeCrawler/1.0"],
  ] as const) {
    test(`ignores ${label}: nothing recorded, no cookies`, async ({ playwright, baseURL }) => {
      const api = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "user-agent": ua, "x-forwarded-for": uniqueIp() } });
      const res = await api.post(COLLECT, { data: pageview("/prueba-cc-analytics-bot") });
      expect(res.status()).toBe(204);
      expect((await api.storageState()).cookies).toEqual([]);
      await api.dispose();
    });
  }

  for (const path of ["/admin/pages", "/preview/about-us", "/api/analytics/collect", "https://evil.test/", "/" + "a".repeat(400)]) {
    test(`ignores a claimed visit to ${path.slice(0, 30)}`, async ({ playwright, baseURL }) => {
      const api = await playwright.request.newContext({ baseURL, extraHTTPHeaders: { "user-agent": HUMAN_UA, "x-forwarded-for": uniqueIp() } });
      const res = await api.post(COLLECT, { data: pageview(path) });
      expect(res.status()).toBe(204);
      expect((await api.storageState()).cookies).toEqual([]);
      await api.dispose();
    });
  }
});

test.describe("what is stored in the visitor's browser", () => {
  test("only the three analytics cookies, and nothing in web storage", async ({ page, context, browserName }) => {
    // The cookies are Secure in a production build, and WebKit (the mobile project) refuses to store a
    // Secure cookie from plain http://127.0.0.1; Chromium treats localhost as secure. Chromium covers it.
    test.skip(browserName === "webkit", "Secure cookies are not stored over plain http in WebKit.");
    await context.setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
    const sent = page.waitForRequest((r) => r.url().endsWith(COLLECT));
    await page.goto("/about-us");
    await sent;
    await page.waitForLoadState("networkidle");
    const cookies = await context.cookies();
    expect(cookies.map((c) => c.name).sort()).toEqual(["osi_attr", "osi_sid", "osi_vid"]);
    const storage = await page.evaluate(() => ({ local: Object.keys(localStorage), session: Object.keys(sessionStorage) }));
    expect(storage).toEqual({ local: [], session: [] });
  });
});
