/**
 * Which newsletter settings are missing. Pure env inspection so the admin can
 * say exactly what to configure instead of a send failing mysteriously.
 *
 * A test send needs only a working sender. A real campaign additionally
 * needs the token secret (every email carries a signed unsubscribe link) and
 * a physical mailing address (required in commercial email by CAN-SPAM; see
 * docs/CONTENT-GAPS.md — the client hasn't supplied one).
 */
export type NewsletterReadiness = {
  canSendTest: boolean;
  canSendCampaign: boolean;
  /** Human-readable names of the missing environment variables. */
  missing: string[];
};

export function getNewsletterReadiness(env: Record<string, string | undefined> = process.env): NewsletterReadiness {
  const sender = ["RESEND_API_KEY", "RESEND_FROM_EMAIL"].filter((name) => !env[name]);
  const campaign = ["NEWSLETTER_TOKEN_SECRET", "NEWSLETTER_MAILING_ADDRESS"].filter((name) => !env[name]);
  return {
    canSendTest: sender.length === 0,
    canSendCampaign: sender.length === 0 && campaign.length === 0,
    missing: [...sender, ...campaign],
  };
}

export function getMailingAddress(): string | null {
  return process.env.NEWSLETTER_MAILING_ADDRESS?.trim() || null;
}
