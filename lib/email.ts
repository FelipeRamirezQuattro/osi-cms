import { Resend } from "resend";

/**
 * Single seam for outbound email (master prompt §9 Phase 6: "notification
 * email (Resend)"). `RESEND_API_KEY`/`CONTACT_NOTIFICATION_EMAIL` are
 * unset until the client provides a Resend account and confirms who
 * should receive contact-form notifications (master prompt open question
 * #4, never answered — see docs/CONTENT-GAPS.md). Sending is best-effort:
 * a missing key or a Resend failure is logged, never thrown — a lead
 * should never be lost because the notification email couldn't go out,
 * since the submission is already durably stored in `form_submissions`.
 */

export type ContactNotificationPayload = {
  firstName: string;
  lastName: string;
  email: string;
  company?: string;
  phone: string;
  message: string;
  pageSlug?: string;
};

export async function sendContactNotification(payload: ContactNotificationPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_NOTIFICATION_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    console.warn("[email] Skipped contact notification — RESEND_API_KEY/CONTACT_NOTIFICATION_EMAIL/RESEND_FROM_EMAIL not set.");
    return;
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to,
      subject: `New contact form submission — ${payload.firstName} ${payload.lastName}`,
      replyTo: payload.email,
      text: [
        `Name: ${payload.firstName} ${payload.lastName}`,
        `Email: ${payload.email}`,
        payload.company ? `Company: ${payload.company}` : null,
        `Phone: ${payload.phone}`,
        payload.pageSlug ? `From page: /${payload.pageSlug}` : null,
        "",
        payload.message,
      ]
        .filter(Boolean)
        .join("\n"),
    });
  } catch (err) {
    console.error("[email] Failed to send contact notification:", err);
  }
}

/**
 * Generic counterpart of sendContactNotification for the Task 10 form
 * engine — any `form_definitions` row with a `notification_email` set
 * gets a best-effort email through the same Resend integration
 * (same env-var gating, same silent no-op when unset). Deliberately a
 * separate function rather than a generalization of
 * sendContactNotification: the contact form's email has a fixed,
 * reviewed field layout (name/email/company/phone/message) that must not
 * change from the outside (Task 10 controller ruling #6), whereas this
 * one renders whatever fields a given form definition happens to have.
 */
export async function sendFormNotification(params: {
  formName: string;
  to: string | null;
  payload: Record<string, unknown>;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !params.to || !from) {
    console.warn(`[email] Skipped "${params.formName}" notification — recipient/RESEND_API_KEY/RESEND_FROM_EMAIL not set.`);
    return;
  }

  const replyTo = typeof params.payload.email === "string" ? params.payload.email : undefined;

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from,
      to: params.to,
      subject: `New submission — ${params.formName}`,
      replyTo,
      text: Object.entries(params.payload)
        .filter(([, value]) => value !== null && value !== undefined && value !== "")
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n"),
    });
  } catch (err) {
    console.error(`[email] Failed to send "${params.formName}" notification:`, err);
  }
}

/**
 * Double opt-in confirmation for a newsletter signup. Same env gating and
 * never-throws behavior as the notifications above, but returns whether
 * the message was actually handed to Resend — the signup action uses that
 * to decide whether to start the resend cooldown (an email that never went
 * out shouldn't lock the address out of trying again).
 */
export async function sendNewsletterConfirmation(params: { to: string; confirmUrl: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.warn("[email] Skipped newsletter confirmation — RESEND_API_KEY/RESEND_FROM_EMAIL not set.");
    return false;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: params.to,
      subject: "Confirm your subscription to Odessa Separator news",
      text: [
        "Thanks for signing up for Odessa Separator news.",
        "",
        "Please confirm your subscription by opening this link:",
        params.confirmUrl,
        "",
        "If you didn't sign up, you can ignore this email — you won't be subscribed.",
      ].join("\n"),
    });
    if (error) {
      console.error("[email] Resend rejected newsletter confirmation:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Failed to send newsletter confirmation:", err);
    return false;
  }
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

/** One preview message to the editor. No unsubscribe headers — it is not a real send. */
export async function sendCampaignTest(params: { to: string; subject: string; html: string; text: string }): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) return { ok: false, message: "Email is not configured (RESEND_API_KEY / RESEND_FROM_EMAIL)." };

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to: params.to, subject: params.subject, html: params.html, text: params.text });
    return error ? { ok: false, message: error.message } : { ok: true };
  } catch (err) {
    console.error("[email] Campaign test failed:", err);
    return { ok: false, message: "Could not reach the email provider." };
  }
}
