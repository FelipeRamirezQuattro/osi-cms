import { expect, test } from "@playwright/test";

// The media + text block (product pages, Oct 2026): media beside its paragraph from
// 768px up, media above the text in every layout on a phone, never wider than the viewport.
// Fixtures live on /styleguide.
for (const width of [390, 768, 1440]) {
  test.describe(`media + text @ ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("stacks on phones, sits side by side from tablet up, never overflows", async ({ page }) => {
      await page.goto("/styleguide");
      await page.waitForLoadState("networkidle");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

      for (const layout of ["media-left", "media-right", "media-above"] as const) {
        const root = page.locator(`[data-media-text="${layout}"]`);
        await root.scrollIntoViewIfNeeded();
        const video = await root.getByRole("button", { name: "Play video" }).boundingBox();
        const text = await root.locator("p").first().boundingBox();
        expect(video, `${layout} video`).not.toBeNull();
        expect(text, `${layout} text`).not.toBeNull();
        const stacked = width < 768 || layout === "media-above";
        if (stacked) {
          expect(text!.y, `${layout} text sits below the video`).toBeGreaterThanOrEqual(video!.y + video!.height - 2);
        } else {
          // Beside: the text starts level with the video's band, on the correct side.
          expect(text!.y).toBeLessThan(video!.y + video!.height);
          if (layout === "media-left") expect(text!.x).toBeGreaterThan(video!.x);
          else expect(text!.x).toBeLessThan(video!.x);
        }
      }
    });
  });
}
