"use client";

import { useState, useTransition } from "react";
import { toggleSavedReportAction } from "@/lib/actions/saved-reports";

/** Wix's "save reports with the star icon for quick access" — optimistic toggle, persisted per admin user. */
export function SaveReportStar({ reportKey, initialSaved }: { reportKey: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved reports" : "Save this report for quick access"}
      disabled={isPending}
      onClick={() => {
        const next = !saved;
        setSaved(next);
        startTransition(async () => {
          await toggleSavedReportAction(reportKey, next);
        });
      }}
      className="shrink-0 text-lg leading-none text-[var(--admin-ink-secondary)] transition-colors hover:text-[var(--admin-warning)] disabled:opacity-50"
    >
      {saved ? "★" : "☆"}
    </button>
  );
}
