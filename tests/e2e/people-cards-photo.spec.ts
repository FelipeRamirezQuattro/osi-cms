import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * people_cards optional photo. Exercised on the /styleguide fixture (three cards: a portrait-ish source, a very wide
 * source, and a card without a photo), so no real person's photo is needed.
 */
for (const width of [1440, 390]) {
  test(`${width}px: photos crop to the same square, cards without one keep today's layout, axe-clean`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/styleguide", { waitUntil: "networkidle" });
    const box = page.locator("[data-styleguide-people-cards]");
    await box.scrollIntoViewIfNeeded();
    // The block fades in on scroll; axe must not sample it mid-transition.
    await expect(box.locator("section").first()).toHaveCSS("opacity", "1");
    const cards = box.getByRole("listitem").filter({ has: page.getByText(/^Test Person/) });
    await expect(cards).toHaveCount(3);

    // Alt text defaults to the name; an explicit alt wins.
    await expect(box.getByRole("img", { name: "Test Person One" })).toBeVisible();
    await expect(box.getByRole("img", { name: "Portrait of Test Person Two" })).toBeVisible();

    // Same fixed square whatever the source's aspect ratio, object-fit: cover, at the top of the card.
    const photos = box.locator("[data-people-photo]");
    await expect(photos).toHaveCount(2);
    const sizes = await photos.evaluateAll((imgs) =>
      imgs.map((i) => {
        const r = i.getBoundingClientRect();
        return { w: Math.round(r.width), h: Math.round(r.height), fit: getComputedStyle(i).objectFit };
      }),
    );
    expect(sizes[0]).toEqual(sizes[1]);
    expect(sizes[0].w).toBe(sizes[0].h);
    expect(sizes[0].fit).toBe("cover");
    const firstCardTop = await cards.nth(0).evaluate((el) => el.getBoundingClientRect().top);
    expect(await photos.nth(0).evaluate((el) => el.getBoundingClientRect().top)).toBeLessThan(firstCardTop + 40);

    // No photo → no image, no placeholder silhouette, no initials.
    const plain = cards.nth(2);
    await expect(plain.locator("img, svg")).toHaveCount(0);
    await expect(plain.getByText("Test Person Three")).toBeVisible();

    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page }).include("[data-styleguide-people-cards]").analyze();
    expect(results.violations).toEqual([]);
  });
}
