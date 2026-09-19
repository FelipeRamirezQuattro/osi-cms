import type { ReactNode } from "react";
import { SaveReportStar } from "@/components/admin/analytics/save-report-star";

/** One report's card: title, optional chart, optional table, and the save-star — the shared shell every analytics report renders through. */
export function ReportSection({
  reportKey,
  title,
  description,
  isSaved,
  chart,
  table,
}: {
  reportKey: string;
  title: string;
  description?: string;
  isSaved: boolean;
  chart?: ReactNode;
  table?: ReactNode;
}) {
  return (
    <section className="admin-card space-y-4 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {description && <p className="mt-1 text-sm text-[var(--admin-ink-secondary)]">{description}</p>}
        </div>
        <SaveReportStar reportKey={reportKey} initialSaved={isSaved} />
      </div>
      {chart}
      {table}
    </section>
  );
}
