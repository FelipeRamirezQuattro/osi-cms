import type { Metadata } from "next";
import { requireCapability } from "@/lib/auth";
import { clearEmailOutboxAction } from "@/lib/actions/email-outbox";
import { listOutboxMessages, type OutboxRow } from "@/lib/data/email-outbox";
import { getEmailMode } from "@/lib/email";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { EmailStatusBanner } from "@/components/admin/email-status-banner";
import { adminButtonClassName } from "@/components/admin/ui/button";
import { formatDateTime } from "@/lib/format/date";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

async function load(): Promise<{ rows: OutboxRow[]; error: string | null }> {
  try {
    return { rows: await listOutboxMessages(), error: null };
  } catch {
    // Most likely migration 0056 hasn't been applied yet.
    return { rows: [], error: "The email outbox table isn't available yet (migration 0056_email_outbox.sql)." };
  }
}

export default async function EmailOutboxPage() {
  await requireCapability("manage_users");
  const { rows, error } = await load();
  const mode = getEmailMode();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Email outbox"
        description="Messages the site would have sent while EMAIL_DRY_RUN is on. Nothing here was delivered."
        actions={
          rows.length > 0 ? (
            <form action={clearEmailOutboxAction}>
              <button type="submit" className={adminButtonClassName("secondary")}>
                Clear outbox
              </button>
            </form>
          ) : undefined
        }
      />
      <EmailStatusBanner />
      {error && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </p>
      )}
      {!error && rows.length === 0 && (
        <p className="text-sm opacity-70">
          {mode === "dry-run" ? "No messages yet." : "Nothing here. Set EMAIL_DRY_RUN=true to capture messages instead of sending them."}
        </p>
      )}
      <ul className="space-y-4">
        {rows.map((row) => (
          <li key={row.id} data-testid="outbox-message" className="admin-card space-y-3 p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold">{row.subject}</h2>
              <span className="text-xs opacity-70">{formatDateTime(row.created_at)}</span>
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <dt className="opacity-70">Type</dt>
              <dd>{row.kind}</dd>
              <dt className="opacity-70">To</dt>
              <dd>{row.to_address}</dd>
              <dt className="opacity-70">From</dt>
              <dd>{row.from_address}</dd>
              {row.reply_to && (
                <>
                  <dt className="opacity-70">Reply-To</dt>
                  <dd>{row.reply_to}</dd>
                </>
              )}
              {Object.entries(row.headers).map(([name, value]) => (
                <div key={name} className="contents">
                  <dt className="opacity-70">{name}</dt>
                  <dd className="break-all">{value}</dd>
                </div>
              ))}
            </dl>
            {row.html_body && (
              <iframe
                title={`HTML preview: ${row.subject}`}
                // Scripts and same-origin access stay off: this is mail content, not trusted markup.
                sandbox=""
                srcDoc={row.html_body}
                className="h-96 w-full rounded border border-[var(--admin-border)] bg-white"
              />
            )}
            <details>
              <summary className="cursor-pointer text-sm font-medium">Plain-text version</summary>
              <pre className="mt-2 whitespace-pre-wrap break-words text-xs">{row.text_body}</pre>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
