import { Resend } from "resend";
import {
  contactConfirmationEmail,
  contactNotificationEmail,
  formNotificationEmail,
  newsletterConfirmEmail,
  newsletterWelcomeEmail,
  type ContactDetails,
} from "@/lib/email-templates";
import { recordOutboxMessage } from "@/lib/data/email-outbox";

/**
 * Single seam for outbound email. Every message goes through `deliver()`,
 * which behaves in exactly one of three ways:
 *
 *   - dry-run      EMAIL_DRY_RUN=true. Nothing is sent; the rendered message
 *                  is logged and stored in `email_outbox`, which admins read at
 *                  /admin/email-outbox. Wins over a configured key, so a
 *                  preview deployment can be exercised safely.
 *   - live         RESEND_API_KEY + RESEND_FROM_EMAIL are set. Sent via Resend.
 *   - unconfigured otherwise. Logged and skipped.
 *
 * Sending is best-effort and never throws: a lead or signup is already stored
 * before any email is attempted, so a mail failure must not lose it.
 */

// Loaded on first use: lib/email-brand pulls in the server-only branding
// resolver, which would otherwise make every importer of this seam
// (including its unit tests) a server-only module.
async function brand() {
  return (await import("@/lib/email-brand")).getEmailBrand();
}

export type EmailMode = "dry-run" | "live" | "unconfigured";

type Env = Record<string, string | undefined>;

export function getEmailMode(env: Env = process.env): EmailMode {
  if (env.EMAIL_DRY_RUN === "true") return "dry-run";
  return env.RESEND_API_KEY && env.RESEND_FROM_EMAIL ? "live" : "unconfigured";
}

const DRY_RUN_FROM = "Odessa Separator <dry-run@example.invalid>";

export type OutgoingEmail = {
  /** Short label stored with dry-run messages, e.g. "contact-notification". */
  kind: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  headers?: Record<string, string>;
};

export type DeliveryResult =
  | { status: "sent"; id: string | null }
  | { status: "dry-run" }
  | { status: "skipped"; reason: string }
  | { status: "failed"; message: string; retryable: boolean };

export function delivered(result: DeliveryResult): boolean {
  return result.status === "sent" || result.status === "dry-run";
}

export async function deliver(message: OutgoingEmail): Promise<DeliveryResult> {
  const mode = getEmailMode();

  if (mode === "dry-run") {
    const from = process.env.RESEND_FROM_EMAIL || DRY_RUN_FROM;
    console.info(`[email] DRY RUN (${message.kind}) to=${message.to} subject="${message.subject}"`);
    await recordOutboxMessage({ ...message, from, replyTo: message.replyTo ?? null });
    return { status: "dry-run" };
  }

  if (mode === "unconfigured") {
    console.warn(`[email] Skipped ${message.kind} — RESEND_API_KEY/RESEND_FROM_EMAIL not set.`);
    return { status: "skipped", reason: "Email is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL)." };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      replyTo: message.replyTo,
      headers: message.headers,
    });
    if (error) {
      console.error(`[email] Resend rejected ${message.kind}:`, error);
      return { status: "failed", message: error.message, retryable: isRetryable(error.statusCode) };
    }
    return { status: "sent", id: data?.id ?? null };
  } catch (err) {
    console.error(`[email] Failed to send ${message.kind}:`, err);
    return { status: "failed", message: "Could not reach the email provider.", retryable: true };
  }
}

// --- Contact + generic forms ---------------------------------------------------

export type ContactNotificationPayload = ContactDetails;

const DRY_RUN_STAFF_RECIPIENT = "contact-notification@dry-run.invalid";

/** To OSI staff (CONTACT_NOTIFICATION_EMAIL), Reply-To the visitor. */
export async function sendContactNotification(payload: ContactNotificationPayload): Promise<void> {
  const to = process.env.CONTACT_NOTIFICATION_EMAIL || (getEmailMode() === "dry-run" ? DRY_RUN_STAFF_RECIPIENT : undefined);
  if (!to) {
    console.warn("[email] Skipped contact notification — CONTACT_NOTIFICATION_EMAIL not set.");
    return;
  }
  const { subject, html, text } = await contactNotificationEmail(await brand(), payload);
  await deliver({ kind: "contact-notification", to, subject, html, text, replyTo: payload.email });
}

/** One-time receipt to the visitor. Not sent when email is unconfigured. */
export async function sendContactConfirmation(payload: ContactNotificationPayload): Promise<void> {
  const { subject, html, text } = await contactConfirmationEmail(await brand(), payload);
  await deliver({ kind: "contact-confirmation", to: payload.email, subject, html, text });
}

/**
 * Generic counterpart for the form engine — any `form_definitions` row with a
 * `notification_email` set gets a best-effort email. Separate from
 * sendContactNotification on purpose: the contact form has a fixed, reviewed
 * field layout (Task 10 controller ruling #6), this one renders whatever
 * fields a form definition happens to have.
 */
export async function sendFormNotification(params: {
  formName: string;
  to: string | null;
  payload: Record<string, unknown>;
}): Promise<void> {
  if (!params.to) {
    console.warn(`[email] Skipped "${params.formName}" notification — no recipient set on the form.`);
    return;
  }
  const { subject, html, text } = await formNotificationEmail(await brand(), params);
  const replyTo = typeof params.payload.email === "string" ? params.payload.email : undefined;
  await deliver({ kind: "form-notification", to: params.to, subject, html, text, replyTo });
}

// --- Newsletter (transactional) ------------------------------------------------

/**
 * Double opt-in confirmation. Returns whether the message was actually handed
 * off (sent or dry-run) — the signup action uses that to decide whether to
 * start the resend cooldown (an email that never went out shouldn't lock the
 * address out of trying again).
 */
export async function sendNewsletterConfirmation(params: { to: string; confirmUrl: string }): Promise<boolean> {
  const { subject, html, text } = await newsletterConfirmEmail(await brand(), params);
  return delivered(await deliver({ kind: "newsletter-confirm", to: params.to, subject, html, text }));
}

/** Sent once, right after a subscriber confirms. Carries the unsubscribe link and the RFC 8058 headers. */
export async function sendNewsletterWelcome(params: {
  to: string;
  unsubscribeUrl: string;
  oneClickUnsubscribeUrl: string;
}): Promise<void> {
  const { subject, html, text } = await newsletterWelcomeEmail(await brand(), { unsubscribeUrl: params.unsubscribeUrl });
  await deliver({
    kind: "newsletter-welcome",
    to: params.to,
    subject,
    html,
    text,
    headers: {
      "List-Unsubscribe": `<${params.oneClickUnsubscribeUrl}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  });
}

// --- Newsletter campaigns ------------------------------------------------------

export type CampaignEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Signed one-click unsubscribe endpoint, for the List-Unsubscribe header. */
  oneClickUnsubscribeUrl: string;
};

export type CampaignBatchResult =
  /** `ids[i]` is the provider message id for `messages[i]`. */
  | { ok: true; ids: string[] }
  /** `retryable` = leave the recipients pending and try again later (rate limit, outage). */
  | { ok: false; retryable: boolean; message: string };

/** Resend's batch endpoint accepts at most 100 messages per request. */
export const CAMPAIGN_BATCH_SIZE = 100;

// 409 is Resend's concurrent-idempotent-request; 429 a rate limit; 5xx or no
// status at all (network) an outage. Anything else is a rejection that
// retrying the same payload will not fix.
function isRetryable(statusCode: number | null): boolean {
  return statusCode === null || statusCode === 409 || statusCode === 429 || statusCode >= 500;
}

/**
 * Sends up to CAMPAIGN_BATCH_SIZE personalized messages in one request. The
 * caller supplies a deterministic `idempotencyKey` (campaign + the exact
 * recipients in the batch) so a retry after a crash between "Resend accepted
 * it" and "we recorded it" can't send the batch twice.
 */
export async function sendCampaignBatch(messages: CampaignEmail[], idempotencyKey: string): Promise<CampaignBatchResult> {
  const mode = getEmailMode();
  // A dry run must never mark real subscribers as "sent" (preview deployments share the live database).
  if (mode === "dry-run") return { ok: false, retryable: false, message: "EMAIL_DRY_RUN is on, so campaigns are not sent. Test sends still land in the email outbox." };
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { ok: false, retryable: false, message: "Email is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL)." };
  if (messages.length === 0) return { ok: true, ids: [] };
  if (messages.length > CAMPAIGN_BATCH_SIZE) throw new Error(`A batch holds at most ${CAMPAIGN_BATCH_SIZE} messages.`);

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.batch.send(
      messages.map((message) => ({
        from,
        to: message.to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: {
          "List-Unsubscribe": `<${message.oneClickUnsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      })),
      { idempotencyKey },
    );
    if (error) return { ok: false, retryable: isRetryable(error.statusCode), message: error.message };
    const ids = data?.data.map((entry) => entry.id) ?? [];
    if (ids.length !== messages.length) {
      return { ok: false, retryable: false, message: "The email provider returned an unexpected response." };
    }
    return { ok: true, ids };
  } catch (err) {
    console.error("[email] Campaign batch failed:", err);
    return { ok: false, retryable: true, message: err instanceof Error ? err.message : "Could not reach the email provider." };
  }
}

/**
 * One preview message to the editor. Not a real send: there is no subscriber
 * row, so there is no signed token and no RFC 8058 one-click POST. The
 * `List-Unsubscribe` header (page URL only) is still set so the mail client
 * shows the unsubscribe affordance a subscriber would see.
 */
export async function sendCampaignTest(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribePageUrl?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const result = await deliver({
    kind: "campaign-test",
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    headers: params.unsubscribePageUrl ? { "List-Unsubscribe": `<${params.unsubscribePageUrl}>` } : undefined,
  });
  if (delivered(result)) return { ok: true };
  return { ok: false, message: result.status === "failed" ? result.message : result.status === "skipped" ? result.reason : "Not sent." };
}
