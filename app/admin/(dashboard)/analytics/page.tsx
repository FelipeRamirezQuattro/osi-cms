import Link from "next/link";
import { requireCapability } from "@/lib/auth";
import { resolveDateRange } from "@/lib/admin/analytics-date-range";
import { listSavedReports } from "@/lib/data/saved-reports";
import { getContactsOverTime, getTrafficSummary } from "@/lib/data/analytics-reports";
import { ANALYTICS_REPORT_CATALOG } from "@/lib/admin/analytics-report-catalog";
import { AnalyticsPageHeader } from "@/components/admin/analytics/analytics-page-header";
import { StatCard } from "@/components/admin/ui/stat-card";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/ui/admin-data-table";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AnalyticsOverviewPage({ searchParams }: Props) {
  await requireCapability("view_analytics");
  const range = resolveDateRange(await searchParams);

  const [summary, contactsOverTime, savedReportKeys] = await Promise.all([
    getTrafficSummary(range),
    getContactsOverTime(range),
    listSavedReports(),
  ]);

  const totalLeads = contactsOverTime.reduce((sum, day) => sum + day.count, 0);
  const savedReports = ANALYTICS_REPORT_CATALOG.filter((report) => savedReportKeys.includes(report.key));

  const savedColumns: AdminDataTableColumn<(typeof savedReports)[number]>[] = [
    {
      key: "label",
      header: "Report",
      render: (report) => (
        <Link href={report.href} className="font-medium hover:underline">
          ★ {report.label}
        </Link>
      ),
    },
    { key: "category", header: "Category", render: (report) => report.category },
  ];

  return (
    <div className="space-y-8">
      <AnalyticsPageHeader
        title="Analytics"
        description="A complete overview of your site's visitor activity across all areas."
        range={range}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard value={summary.totalSessions.toLocaleString()} label="Site sessions" href="/admin/analytics/traffic" />
        <StatCard value={summary.totalPageViews.toLocaleString()} label="Page views" href="/admin/analytics/traffic" />
        <StatCard value={summary.totalUniqueVisitors.toLocaleString()} label="Unique visitors" href="/admin/analytics/people" />
        <StatCard value={totalLeads.toLocaleString()} label="Form leads" href="/admin/analytics/people" />
      </div>

      <section className="space-y-4">
        <h2 className="text-base font-semibold tracking-tight">Saved reports</h2>
        <AdminDataTable
          columns={savedColumns}
          rows={savedReports}
          getRowKey={(report) => report.key}
          emptyMessage="Star a report from any category page for quick access here."
        />
      </section>
    </div>
  );
}
