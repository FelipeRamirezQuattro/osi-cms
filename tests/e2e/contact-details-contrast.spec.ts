import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// F2: with a short maps.app.goo.gl link the contact_details block shows a fallback
// card. Its text used fixed colours, so on a light section it was white on cream.
// The fixtures are the block rendered by /styleguide on a navy and a cream section, and on a light/dark surface preset that overrides the section's background. Run once per
// layout (OSI_LAYOUT_OVERRIDE=classic|forge, see forge-theme.spec.ts).
for (const surface of ["navy", "cream", "light-preset", "dark-preset"] as const) {
  test(`map fallback is readable on the ${surface} surface`, async ({ page }) => {
    await page.goto("/styleguide");
    const fixture = page.getByTestId(`contact-fallback-${surface}`);
    await expect(fixture.getByText("Map preview unavailable")).toBeVisible();
    await fixture.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000); // let the reveal fade finish before measuring contrast
    const results = await new AxeBuilder({ page })
      .include(`[data-testid="contact-fallback-${surface}"]`)
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.html.slice(0, 60)).join(" | ")}`)).toEqual([]);
  });
}
