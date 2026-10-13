import { expect, test } from "@playwright/test";

// The token-hash email flow must verify ONLY on a button press (mail
// scanners prefetch links). No credentials needed: a fake token is enough
// to prove GET is inert and POST is what talks to Supabase.
test.describe("/admin/auth/confirm", () => {
  test("GET renders a button and verifies nothing", async ({ page }) => {
    const response = await page.goto("/admin/auth/confirm?token_hash=fake-token&type=recovery");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
    // Still here after the page settles — a GET-time verify with a bad token would have redirected away.
    await page.waitForTimeout(500);
    expect(new URL(page.url()).pathname).toBe("/admin/auth/confirm");
  });

  test("pressing the button verifies; a bad token lands on the expired message", async ({ page }) => {
    await page.goto("/admin/auth/confirm?token_hash=fake-token&type=recovery");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForURL(/\/admin\/forgot-password\?expired=1/);
    await expect(page.getByText(/expired or was already used/i)).toBeVisible();
  });

  test("invite links get the invitation wording", async ({ page }) => {
    await page.goto("/admin/auth/confirm?token_hash=fake-token&type=invite");
    await expect(page.getByRole("button", { name: "Accept invitation" })).toBeVisible();
  });

  test("a link with no token explains itself", async ({ page }) => {
    await page.goto("/admin/auth/confirm");
    await expect(page.getByText(/invalid or incomplete/i)).toBeVisible();
  });

  test("a public URL with otp_expired in the query string is redirected", async ({ page }) => {
    await page.goto("/?error=access_denied&error_code=otp_expired");
    await expect(page).toHaveURL(/\/admin\/forgot-password\?expired=1/);
  });
});
