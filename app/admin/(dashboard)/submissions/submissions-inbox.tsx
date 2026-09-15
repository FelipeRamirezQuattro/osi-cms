"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { exportSubmissionsCsvAction, updateSubmissionStatusAction } from "@/lib/actions/submissions";
import type { Tables } from "@/lib/db/database.types";

type Submission = Tables<"form_submissions">;

const TABS: { key: Submission["status"] | "all"; label: string }[] = [
  { key: "new", label: "New" },
  { key: "read", label: "Read" },
  { key: "archived", label: "Archived" },
  { key: "all", label: "All" },
];

export function SubmissionsInbox({ submissions }: { submissions: Submission[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("new");
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = useMemo(
    () => (tab === "all" ? submissions : submissions.filter((s) => s.status === tab)),
    [submissions, tab],
  );

  function setStatus(id: string, status: Submission["status"]) {
    startTransition(async () => {
      await updateSubmissionStatusAction(id, status);
      router.refresh();
    });
  }

  // Task 15 submissions export: the Server Action returns CSV text (no
  // file-response path for a Server Action), so the download itself is a
  // plain client-side Blob + temporary <a download> — same technique any
  // "export to CSV" button uses without a dedicated route handler.
  const [isExporting, startExport] = useTransition();
  function exportCsv() {
    startExport(async () => {
      const csv = await exportSubmissionsCsvAction();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `submissions-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-lg tracking-wide-display uppercase">Submissions</h1>
        <button
          type="button"
          onClick={exportCsv}
          disabled={isExporting}
          className="rounded border border-osi-navy-900 px-3 py-1.5 text-xs uppercase tracking-wide-label disabled:opacity-50"
        >
          {isExporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      <div className="flex gap-2 border-b border-osi-sand-300 pb-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? "rounded bg-osi-navy-900 px-3 py-1.5 text-xs uppercase tracking-wide-label text-osi-white"
                : "rounded border border-osi-sand-300 px-3 py-1.5 text-xs uppercase tracking-wide-label"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map((sub) => {
          const payload = sub.payload as Record<string, unknown>;
          const isOpen = expanded === sub.id;
          return (
            <div key={sub.id} className="rounded border border-osi-sand-300 bg-osi-white">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : sub.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm"
              >
                <span>
                  <span className="font-medium">{sub.form_key}</span>{" "}
                  <span className="opacity-60">
                    {String(payload.email ?? payload.name ?? "")} — {new Date(sub.created_at).toLocaleString()}
                  </span>
                </span>
                <span
                  className={
                    sub.status === "new"
                      ? "rounded bg-osi-gold-500/20 px-2 py-0.5 text-xs"
                      : "rounded bg-osi-sand-300/50 px-2 py-0.5 text-xs opacity-70"
                  }
                >
                  {sub.status}
                </span>
              </button>
              {isOpen && (
                <div className="space-y-3 border-t border-osi-sand-300 px-4 py-3 text-sm">
                  <dl className="grid grid-cols-2 gap-2">
                    {Object.entries(payload).map(([key, value]) => (
                      <div key={key}>
                        <dt className="text-xs uppercase tracking-wide-label opacity-50">{key}</dt>
                        <dd>{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                  {sub.page_slug && <p className="text-xs opacity-50">From page: /{sub.page_slug}</p>}
                  <div className="flex gap-3 text-xs">
                    {sub.status !== "read" && (
                      <button type="button" onClick={() => setStatus(sub.id, "read")} disabled={isPending} className="hover:underline">
                        Mark read
                      </button>
                    )}
                    {sub.status !== "archived" && (
                      <button
                        type="button"
                        onClick={() => setStatus(sub.id, "archived")}
                        disabled={isPending}
                        className="hover:underline"
                      >
                        Archive
                      </button>
                    )}
                    {sub.status !== "new" && (
                      <button type="button" onClick={() => setStatus(sub.id, "new")} disabled={isPending} className="hover:underline">
                        Mark new
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-osi-slate-400">No submissions here.</p>}
      </div>
    </div>
  );
}
