import { expect, test, type Page } from "@playwright/test";
import { ADMIN_EMAIL, ADMIN_PASSWORD, SKIP_REASON, signIn } from "./helpers/admin-auth";

/**
 * W2 — every email flow end to end in dry-run mode. Nothing is sent: the
 * server under test must run with EMAIL_DRY_RUN=true, and each message lands
 * in the admin-only outbox (/admin/email-outbox, migration 0056) where this
 * spec reads it back. It writes "PRUEBA CC" rows (a contact submission, a
 * subscriber and one reusable draft page) to whatever database .env.local
 * points at; nothing is published and nothing is deleted.
 */
const NEWSLETTER_PAGE_SLUG = "prueba-cc-newsletter-signup";

test.describe("email flows (dry-run)", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, SKIP_REASON);
  test.describe.configure({ mode: "serial" });

  async function openOutbox(page: Page) {
    await page.goto("/admin/email-outbox");
    await page.waitForLoadState("networkidle");
    const unavailable = await page.getByText("email outbox table isn't available yet").count();
    const dryRun = await page.getByText("dry-run", { exact: false }).count();
    test.skip(unavailable > 0, "Migration 0056_email_outbox.sql is not applied to this database.");
    test.skip(dryRun === 0, "Start the server with EMAIL_DRY_RUN=true.");
  }

  function messageTo(page: Page, address: string, subject: RegExp) {
    return page.getByTestId("outbox-message").filter({ hasText: address }).filter({ hasText: subject }).first();
  }

  test("the outbox is admin-only and explains dry-run", async ({ page, request }) => {
    const anonymous = await request.get("/admin/email-outbox", { maxRedirects: 0 });
    expect([302, 307, 308]).toContain(anonymous.status());
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await openOutbox(page);
    await expect(page.getByRole("heading", { name: "Email outbox" })).toBeVisible();
  });

  test("contact form: staff notification and visitor confirmation", async ({ page }) => {
    const stamp = Date.now();
    const visitor = `prueba-cc-${stamp}@example.com`;
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await openOutbox(page);

    await page.goto("/contact");
    await page.waitForLoadState("networkidle");
    await page.getByLabel(/first name/i).fill("PRUEBA CC");
    await page.getByLabel(/last name/i).fill(`Contact ${stamp}`);
    await page.getByLabel(/^email/i).fill(visitor);
    await page.getByLabel(/phone/i).first().fill("555-0100");
    await page.getByLabel(/message/i).fill("PRUEBA CC dry-run contact message");
    await page.getByRole("button", { name: /send|submit/i }).click();
    await expect(page.getByText("Thanks for reaching out")).toBeVisible({ timeout: 20_000 });

    await page.goto("/admin/email-outbox");
    const confirmation = messageTo(page, visitor, /We received your message/);
    await expect(confirmation).toBeVisible();
    await expect(confirmation).toContainText("contact-confirmation");
    const notification = messageTo(page, visitor, new RegExp(`New contact form submission — PRUEBA CC Contact ${stamp}`));
    await expect(notification).toBeVisible();
    await expect(notification).toContainText("Reply-To");
    await expect(notification.locator("iframe")).toHaveCount(1);
    // The submission itself is still saved.
    await page.goto("/admin/submissions");
    await expect(page.getByText(`Contact ${stamp}`).first()).toBeVisible();
  });

  test("newsletter: sign up, confirm, welcome, one-click unsubscribe", async ({ page, request }) => {
    test.setTimeout(180_000);
    const stamp = Date.now();
    const subscriber = `prueba-cc-news-${stamp}@example.com`;
    await signIn(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await openOutbox(page);

    // One reusable draft page holding the signup block (the live site has none). Never published.
    await page.goto("/admin/pages/new");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Title").fill("PRUEBA CC newsletter signup");
    await page.getByLabel("Slug").fill(NEWSLETTER_PAGE_SLUG);
    await page.getByRole("button", { name: "Create page" }).click();
    const created = await page
      .waitForURL(/\/admin\/pages\/[0-9a-f-]{36}$/, { timeout: 15_000 })
      .then(() => true)
      .catch(() => false);
    if (created) {
      await page.waitForLoadState("networkidle");
      await page.getByPlaceholder("Search blocks by name or purpose…").fill("newsletter");
      await page.getByRole("button", { name: /^Newsletter signup/ }).first().click();
      await expect(page.locator("[data-block-toggle]")).toHaveCount(1);
      await page.getByRole("button", { name: "Save draft" }).click();
      await expect(page.getByText("Saved")).toBeVisible({ timeout: 20_000 });
    }

    await page.goto(`/preview/${NEWSLETTER_PAGE_SLUG}`);
    await page.waitForLoadState("networkidle");
    await page.getByPlaceholder("Email Address").fill(subscriber);
    await page.getByRole("button", { name: /subscribe|sign up|submit/i }).click();
    await expect(page.getByText("Check your inbox")).toBeVisible({ timeout: 20_000 });

    // The confirmation email, with the link the subscriber would click.
    await page.goto("/admin/email-outbox");
    const confirmMessage = messageTo(page, subscriber, /Confirm your subscription/);
    await expect(confirmMessage).toBeVisible();
    await confirmMessage.getByText("Plain-text version").click();
    const confirmText = await confirmMessage.locator("pre").innerText();
    const confirmPath = confirmText.match(/https?:\/\/[^\s/]+(\/newsletter\/confirm\?token=\S+)/)?.[1];
    expect(confirmPath, "confirm link in the email").toBeTruthy();

    await page.goto(confirmPath!);
    await page.getByRole("button", { name: "Confirm subscription" }).click();
    await expect(page.getByText("You're subscribed")).toBeVisible({ timeout: 20_000 });

    // Welcome email, carrying the RFC 8058 headers.
    await page.goto("/admin/email-outbox");
    const welcome = messageTo(page, subscriber, /Welcome to/);
    await expect(welcome).toBeVisible();
    await expect(welcome).toContainText("List-Unsubscribe-Post");
    await expect(welcome).toContainText("List-Unsubscribe=One-Click");
    const header = await welcome.locator("dd", { hasText: /^<https?:.*\/api\/newsletter\/unsubscribe\?token=/ }).innerText();
    const unsubscribePath = header.match(/https?:\/\/[^\s/]+(\/api\/newsletter\/unsubscribe\?token=[^>\s]+)/)?.[1];
    expect(unsubscribePath, "one-click URL in List-Unsubscribe").toBeTruthy();

    const oneClick = await request.post(unsubscribePath!, { data: "List-Unsubscribe=One-Click" });
    expect(oneClick.status()).toBe(200);
    expect((await request.post("/api/newsletter/unsubscribe?token=nope.nope")).status()).toBe(400);
  });
});
