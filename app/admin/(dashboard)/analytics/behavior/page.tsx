import { requireCapability } from "@/lib/auth";
import { resolveDateRange } from "@/lib/admin/analytics-date-range";
import { listSavedReports } from "@/lib/data/saved-reports";
import {
  getButtonClicks,
  getButtonClicksOverTime,
  getClicksToContactOverTime,
  getFormSubmissionsByForm,
  getFormSubmissionsOverTime,
  getPageVisits,
  getSearchesOverTime,
  getSearchesWithNoResults,
  getTopSearches,
} from "@/lib/data/analytics-reports";
import { AnalyticsPageHeader } from "@/components/admin/analytics/analytics-page-header";
import { ReportSection } from "@/components/admin/analytics/report-section";
import { BarChartCard, LineChartCard } from "@/components/admin/analytics/chart-card";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function BehaviorReportsPage({ searchParams }: Props) {
  await requireCapability("view_analytics");
  const range = resolveDateRange(await searchParams);

  const [
    buttonClicks,
    buttonClicksOverTime,
    pageVisits,
    submissionsByForm,
    submissionsOverTime,
    topSearches,
    searchesNoResults,
    searchesOverTime,
    clicksToContactOverTime,
    savedReports,
  ] = await Promise.all([
    getButtonClicks(range),
    getButtonClicksOverTime(range),
    getPageVisits(range),
    getFormSubmissionsByForm(range),
    getFormSubmissionsOverTime(range),
    getTopSearches(range),
    getSearchesWithNoResults(range),
    getSearchesOverTime(range),
    getClicksToContactOverTime(range),
    listSavedReports(),
  ]);

  const isSaved = (key: string) => savedReports.includes(key);

  return (
    <div className="space-y-8">
      <AnalyticsPageHeader
        title="Behavior"
        description="Learn how people navigate your site and look for places to increase conversion."
        range={range}
      />

      <ReportSection
        reportKey="button_clicks"
        title="Button Clicks"
        isSaved={isSaved("button_clicks")}
        chart={buttonClicks.length > 0 ? <BarChartCard data={buttonClicks} labelKey="label" valueKey="count" /> : undefined}
      />

      <ReportSection
        reportKey="button_clicks_over_time"
        title="Button Clicks over Time"
        isSaved={isSaved("button_clicks_over_time")}
        chart={<LineChartCard data={buttonClicksOverTime} xKey="date" yKey="count" />}
      />

      <ReportSection
        reportKey="page_visits"
        title="Page Visits"
        isSaved={isSaved("page_visits")}
        chart={<BarChartCard data={pageVisits.slice(0, 15)} labelKey="path" valueKey="pageViews" />}
      />

      <ReportSection
        reportKey="submissions_by_form"
        title="Submissions by Form"
        isSaved={isSaved("submissions_by_form")}
        chart={submissionsByForm.length > 0 ? <BarChartCard data={submissionsByForm} labelKey="formKey" valueKey="count" /> : undefined}
      />

      <ReportSection
        reportKey="form_submissions_over_time"
        title="Form Submissions over Time"
        isSaved={isSaved("form_submissions_over_time")}
        chart={<LineChartCard data={submissionsOverTime} xKey="date" yKey="count" />}
      />

      <ReportSection
        reportKey="top_searches"
        title="Top Searches"
        isSaved={isSaved("top_searches")}
        chart={topSearches.length > 0 ? <BarChartCard data={topSearches} labelKey="query" valueKey="count" /> : undefined}
      />

      <ReportSection
        reportKey="searches_with_no_results"
        title="Searches with No Results"
        isSaved={isSaved("searches_with_no_results")}
        chart={searchesNoResults.length > 0 ? <BarChartCard data={searchesNoResults} labelKey="query" valueKey="count" /> : undefined}
      />

      <ReportSection
        reportKey="searches_over_time"
        title="Searches over Time"
        isSaved={isSaved("searches_over_time")}
        chart={<LineChartCard data={searchesOverTime} xKey="date" yKey="count" />}
      />

      <ReportSection
        reportKey="clicks_to_contact_over_time"
        title="Clicks-to-Contact over Time"
        isSaved={isSaved("clicks_to_contact_over_time")}
        chart={<LineChartCard data={clicksToContactOverTime} xKey="date" yKey="count" />}
      />
    </div>
  );
}
