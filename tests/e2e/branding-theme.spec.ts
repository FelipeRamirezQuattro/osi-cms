import { expect, test } from "@playwright/test";

test("published branding is present in initial public HTML", async ({ page }) => {
  const response = await page.goto("/");
  expect(response).not.toBeNull();
  const html = await response!.text();

  expect(html).toContain("data-branding-source=");
  expect(html).toContain("--brand-color-primary:");
  expect(html).toContain("--font-body-source:");

  const shell = page.locator(".public-site.site-shell");
  await expect(shell).toHaveCount(1);
  await expect(shell).toHaveCSS("font-family", /Poppins|Source Sans 3|Inter|system-ui|Segoe UI/);
});

test("admin routes do not receive the public theme boundary or font requests", async ({ page }) => {
  const fontRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "font" || /\.woff2(?:\?|$)/.test(request.url())) {
      fontRequests.push(request.url());
    }
  });

  const response = await page.goto("/admin/login", { waitUntil: "networkidle" });
  expect(response).not.toBeNull();
  const html = await response!.text();

  expect(html).not.toContain("data-branding-source=");
  expect(html).not.toContain("--font-catalog-");
  expect(await page.locator(".admin-root").evaluate((element) => getComputedStyle(element).fontFamily)).toMatch(
    /ui-sans-serif|system-ui|Segoe UI/,
  );
  expect(fontRequests).toEqual([]);
});
