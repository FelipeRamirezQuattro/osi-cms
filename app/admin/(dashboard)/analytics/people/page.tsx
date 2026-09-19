import { requireCapability } from "@/lib/auth";
import { resolveDateRange } from "@/lib/admin/analytics-date-range";
import { listSavedReports } from "@/lib/data/saved-reports";
import { getContactsBySource, getContactsOverTime, getFormLeads, getNewVsReturningVisitors } from "@/lib/data/analytics-reports";
import { AnalyticsPageHeader } from "@/components/admin/analytics/analytics-page-header";
import { ReportSection } from "@/components/admin/analytics/report-section";
import { BarChartCard, LineChartCard } from "@/components/admin/analytics/chart-card";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/ui/admin-data-table";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PeopleReportsPage({ searchParams }: Props) {
  await requireCapability("view_analytics");
  const range = resolveDateRange(await searchParams);

  const [newVsReturning, contactsOverTime, formLeads, contactsBySource, savedReports] = await Promise.all([
    getNewVsReturningVisitors(range),
    getContactsOverTime(range),
    getFormLeads(range),
    getContactsBySource(range),
    listSavedReports(),
  ]);

  const isSaved = (key: string) => savedReports.includes(key);

  const newVsReturningData = [
    { label: "New visitors", count: newVsReturning.newVisitors },
    { label: "Returning visitors", count: newVsReturning.returningVisitors },
  ];

  const leadColumns: AdminDataTableColumn<(typeof formLeads)[number]>[] = [
    { key: "createdAt", header: "Date", render: (r) => new Date(r.createdAt).toLocaleString() },
    { key: "formKey", header: "Form", render: (r) => r.formKey },
    { key: "pageSlug", header: "Page", render: (r) => r.pageSlug ?? "—" },
  ];

  return (
    <div className="space-y-8">
      <AnalyticsPageHeader
        title="People"
        description="Improve your reach by understanding more about your visitors and leads."
        range={range}
      />

      <ReportSection
        reportKey="new_vs_returning_visitors"
        title="New vs. Returning Visitors"
        isSaved={isSaved("new_vs_returning_visitors")}
        chart={<BarChartCard data={newVsReturningData} labelKey="label" valueKey="count" />}
      />

      <ReportSection
        reportKey="contacts_over_time"
        title="Contacts over Time"
        isSaved={isSaved("contacts_over_time")}
        chart={<LineChartCard data={contactsOverTime} xKey="date" yKey="count" />}
      />

      <ReportSection
        reportKey="form_leads"
        title="Form Leads"
        isSaved={isSaved("form_leads")}
        table={
          <AdminDataTable columns={leadColumns} rows={formLeads} getRowKey={(r) => r.id} emptyMessage="No leads in this range." />
        }
      />

      <ReportSection
        reportKey="contacts_by_source"
        title="Contacts by Source"
        isSaved={isSaved("contacts_by_source")}
        chart={contactsBySource.length > 0 ? <BarChartCard data={contactsBySource} labelKey="trafficCategory" valueKey="count" /> : undefined}
      />
    </div>
  );
}
