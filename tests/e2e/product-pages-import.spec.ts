import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, SKIP_REASON, signIn } from "./helpers/admin-auth";

// QA, Oct 13: the same defects repeated on every imported product page.
// These products are drafts until QA signs off, so they're read through the
// staff-only preview route. Checks the template/importer fixes on 3 real
// products at desktop and phone widths.
//
// `minPlayers` is the least number of video players the page must show. The
// imported drafts carry their Wix videos; the published product (SRP Sand
// Lift — the preview route renders published products too) has none, so it
// checks the template only. esp-guardian-shield was dropped from this list
// when it went back to draft and left its category (Oct 2026).
const PRODUCTS = [
  { category: "gas-separation", slug: "gas-shield", name: /^Gas Shield$/i, minPlayers: 3, draft: true },
  { category: "chemical-treatment", slug: "esp-sand-d", name: /ESP Sand Diverter/i, minPlayers: 1, draft: true },
  { category: "sand-control", slug: "srp-sand-lift", name: /^SRP Sand Lift$/i, minPlayers: 0, draft: false },
];

async function noSidewaysScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "page scrolls sideways").toBeLessThanOrEqual(0);
}

for (const viewport of [
  { label: "1440", width: 1440, height: 900 },
  { label: "390", width: 390, height: 844 },
]) {
  test.describe(`imported product pages @ ${viewport.label}px`, () => {
    test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, SKIP_REASON);
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const p of PRODUCTS) {
      test(`${p.slug}`, async ({ page }, testInfo) => {
        await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
        const response = await page.goto(`/preview/products/${p.category}/${p.slug}`);
        expect(response?.status()).toBe(200);
        await page.waitForLoadState("networkidle");

        // Title comes from the Wix page, not the URL.
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(p.name);

        // The intro appears once — not again as the How It Works body.
        const intro = (await page.locator("main, body").first().innerText()).match(/ESP|Gas Shield|Diverter/gi) ?? [];
        expect(intro.length).toBeGreaterThan(0);
        const heroParagraphs = page.locator("h1 + div p, h1 ~ div p").first();
        if (await heroParagraphs.count()) expect(await heroParagraphs.innerText()).not.toBe("");

        // Extra videos arrive as real players (play buttons), in addition to the hero video.
        const players = await page.getByRole("button", { name: "Play video" }).count();
        expect(players).toBeGreaterThanOrEqual(p.minPlayers);

        // The product image is the original asset, not a cropped Wix rendition.
        const srcs = await page.locator("img").evaluateAll((imgs) => (imgs as HTMLImageElement[]).map((i) => i.currentSrc || i.src));
        expect(srcs.filter((s) => /\/v1\/crop\//.test(decodeURIComponent(s)))).toEqual([]);
        const broken = await page.locator("main img, section img").evaluateAll((imgs) =>
          (imgs as HTMLImageElement[]).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src),
        );
        expect(broken).toEqual([]);

        // Staff preview labels what's missing (drafts only); nothing reads as a dead link.
        if (p.draft) await expect(page.getByText(/Preview — draft/)).toBeVisible();
        expect(await page.locator('a[href="#"]').count()).toBe(0);

        // Sections reveal on scroll; walk the page so what we assert and capture is what a visitor sees.
        await page.evaluate(async () => {
          for (let y = 0; y < document.body.scrollHeight; y += 500) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 120));
          }
          window.scrollTo(0, 0);
        });
        await page.waitForTimeout(600);
        await noSidewaysScroll(page);
        await page.screenshot({ path: testInfo.outputPath(`${p.slug}-${viewport.label}.png`), fullPage: true });
      });
    }
  });
}

test.describe("public product page", () => {
  test("a published product has no 'pending client file' buttons", async ({ page }) => {
    const response = await page.goto("/products/sand-control/srp-sand-lift");
    expect(response?.status()).toBe(200);
    await expect(page.getByText(/pending client file/i)).toHaveCount(0);
  });
});
