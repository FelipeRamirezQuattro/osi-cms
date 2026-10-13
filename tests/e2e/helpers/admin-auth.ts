import type { Page } from "@playwright/test";

/** Dedicated QA accounts (see .env.local). Falls back to the older ADMIN_E2E_* names. */
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? process.env.ADMIN_E2E_EMAIL;
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? process.env.ADMIN_E2E_PASSWORD;
export const EDITOR_EMAIL = process.env.E2E_EDITOR_EMAIL;
export const EDITOR_PASSWORD = process.env.E2E_EDITOR_PASSWORD;

export const SKIP_REASON = "Set E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD in .env.local to run admin e2e tests.";

export async function signIn(page: Page, email: string, password: string) {
  await page.goto("/admin/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/admin(?!\/login)/);
}

/** Collects client-side crashes so a test can assert there were none. */
export function trackPageErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  return errors;
}
