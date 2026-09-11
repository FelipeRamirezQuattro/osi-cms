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
