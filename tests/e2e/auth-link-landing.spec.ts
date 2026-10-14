import { expect, test } from "@playwright/test";

// Supabase falls back to the Site URL (the public home page) when a reset email's redirect isn't in its
// allow-list. QA hit exactly that: the link opened the home page and "nothing happened".
test.describe("auth emails that land on the public site", () => {
  test("a recovery session in the fragment is forwarded to the reset page", async ({ page }) => {
    await page.goto("/#access_token=fake&refresh_token=fake&expires_in=3600&token_type=bearer&type=recovery");
    await page.waitForURL(/\/admin\/reset-password/);
    // Fake tokens can't create a session, so the page ends on the friendly 'expired' message — not a blank home page.
    await expect(page.getByText(/invalid or has expired/i)).toBeVisible();
  });

  test("a dead link in the fragment says so and offers a new one", async ({ page }) => {
    await page.goto("/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
    await page.waitForURL(/\/admin\/forgot-password\?expired=1/);
    await expect(page.getByText(/expired or was already used/i)).toBeVisible();
  });

  test("an ordinary home page load is untouched", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/$/);
  });
});
