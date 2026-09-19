import { requireCapability } from "@/lib/auth";
import { resolveDateRange } from "@/lib/admin/analytics-date-range";
import { listSavedReports } from "@/lib/data/saved-reports";
import { getTrafficByLocation, getTrafficByTimeOfDay, getTrafficOverTime } from "@/lib/data/analytics-reports";
import { AnalyticsPageHeader } from "@/components/admin/analytics/analytics-page-header";
import { ReportSection } from "@/components/admin/analytics/report-section";
import { BarChartCard, LineChartCard } from "@/components/admin/analytics/chart-card";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/ui/admin-data-table";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function TrafficReportsPage({ searchParams }: Props) {
  await requireCapability("view_analytics");
  const range = resolveDateRange(await searchParams);

  const [overTime, byLocation, byTimeOfDay, savedReports] = await Promise.all([
    getTrafficOverTime(range),
    getTrafficByLocation(range),
    getTrafficByTimeOfDay(range),
    listSavedReports(),
  ]);

  const locationColumns: AdminDataTableColumn<(typeof byLocation)[number]>[] = [
    { key: "country", header: "Country", render: (r) => r.country },
    { key: "pageViews", header: "Page views", render: (r) => r.pageViews },
    { key: "sessions", header: "Sessions", render: (r) => r.sessions },
    { key: "uniqueVisitors", header: "Unique visitors", render: (r) => r.uniqueVisitors },
  ];

  return (
    <div className="space-y-8">
      <AnalyticsPageHeader
        title="Traffic"
        description="Learn how people find your site and discover ways to grow your audience."
        range={range}
      />

      <ReportSection
        reportKey="traffic_over_time"
        title="Traffic over Time"
        isSaved={savedReports.includes("traffic_over_time")}
        chart={<LineChartCard data={overTime} xKey="date" yKey="sessions" />}
      />

      <ReportSection
        reportKey="traffic_by_location"
        title="Traffic by Location"
        isSaved={savedReports.includes("traffic_by_location")}
        table={
          <AdminDataTable
            columns={locationColumns}
            rows={byLocation}
            getRowKey={(r) => r.country}
            emptyMessage="No traffic recorded in this range."
          />
        }
      />

      <ReportSection
        reportKey="traffic_by_time_of_day"
        title="Traffic by Time of Day"
        description="Hours are in UTC."
        isSaved={savedReports.includes("traffic_by_time_of_day")}
        chart={
          <BarChartCard
            data={byTimeOfDay.map((r) => ({ ...r, hourLabel: `${r.hour}:00` }))}
            labelKey="hourLabel"
            valueKey="sessions"
          />
        }
      />
    </div>
  );
}
