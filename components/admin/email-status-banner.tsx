import Link from "next/link";
import { getEmailMode } from "@/lib/email";

/**
 * Tells staff whether the site can actually send email. Silent when live.
 * Shown on the dashboard and the submissions inbox, where a missing sender
 * would otherwise go unnoticed: the contact form still saves and reports
 * success, but nobody is notified.
 */
export function EmailStatusBanner() {
  const mode = getEmailMode();
  if (mode === "live") return null;

  if (mode === "dry-run") {
    return (
      <p role="status" className="rounded border border-osi-gold-500/50 bg-osi-gold-500/10 px-4 py-3 text-sm">
        Email is in <strong>dry-run</strong> mode: nothing is sent. Messages the site would have sent are kept in the{" "}
        <Link href="/admin/email-outbox" className="underline">
          email outbox
        </Link>
        .
      </p>
    );
  }

  return (
    <p role="status" className="rounded border border-osi-gold-500/50 bg-osi-gold-500/10 px-4 py-3 text-sm">
      <strong>Email is not configured.</strong> Form submissions are still saved here, but no notification or confirmation
      email is sent until RESEND_API_KEY and RESEND_FROM_EMAIL are set.
    </p>
  );
}
