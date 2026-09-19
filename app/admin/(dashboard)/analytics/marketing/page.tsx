import { requireCapability } from "@/lib/auth";
import { resolveDateRange } from "@/lib/admin/analytics-date-range";
import { listSavedReports } from "@/lib/data/saved-reports";
import {
  getFormSubmissionsByTrafficSource,
  getPaidCampaignsOverTime,
  getTopPaidCampaigns,
  getTopTrafficSources,
  getTrafficCategoriesOverTime,
} from "@/lib/data/analytics-reports";
import { AnalyticsPageHeader } from "@/components/admin/analytics/analytics-page-header";
import { ReportSection } from "@/components/admin/analytics/report-section";
import { BarChartCard, LineChartCard } from "@/components/admin/analytics/chart-card";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function MarketingReportsPage({ searchParams }: Props) {
  await requireCapability("view_analytics");
  const range = resolveDateRange(await searchParams);

  const [categoriesOverTime, topSources, submissionsBySource, paidOverTime, topPaidCampaigns, savedReports] = await Promise.all([
    getTrafficCategoriesOverTime(range),
    getTopTrafficSources(range),
    getFormSubmissionsByTrafficSource(range),
    getPaidCampaignsOverTime(range),
    getTopPaidCampaigns(range),
    listSavedReports(),
  ]);

  const isSaved = (key: string) => savedReports.includes(key);

  return (
    <div className="space-y-8">
      <AnalyticsPageHeader
        title="Marketing"
        description="See which traffic sources work best for you, and analyze the impact of your outreach."
        range={range}
      />

      <ReportSection
        reportKey="traffic_categories_over_time"
        title="Traffic Categories over Time"
        description="Direct, organic, social, referral, and paid sessions."
        isSaved={isSaved("traffic_categories_over_time")}
        chart={<LineChartCard data={categoriesOverTime} xKey="date" yKey="organic" />}
      />

      <ReportSection
        reportKey="top_traffic_sources"
        title="Top Traffic Sources"
        isSaved={isSaved("top_traffic_sources")}
        chart={topSources.length > 0 ? <BarChartCard data={topSources} labelKey="source" valueKey="sessions" /> : undefined}
      />

      <ReportSection
        reportKey="form_submissions_by_traffic_source"
        title="Form Submissions by Traffic Source"
        isSaved={isSaved("form_submissions_by_traffic_source")}
        chart={
          submissionsBySource.length > 0 ? (
            <BarChartCard data={submissionsBySource} labelKey="trafficCategory" valueKey="count" />
          ) : undefined
        }
      />

      <ReportSection
        reportKey="paid_ad_campaigns_over_time"
        title="Paid Ad Campaigns over Time"
        description="Sessions carrying a paid utm_medium (cpc/ppc/paid/cpm/display) — no ad-platform integration, UTM-tagged links only."
        isSaved={isSaved("paid_ad_campaigns_over_time")}
        chart={<LineChartCard data={paidOverTime} xKey="date" yKey="count" />}
      />

      <ReportSection
        reportKey="top_paid_ad_campaigns"
        title="Top Paid Ad Campaigns"
        isSaved={isSaved("top_paid_ad_campaigns")}
        chart={topPaidCampaigns.length > 0 ? <BarChartCard data={topPaidCampaigns} labelKey="campaign" valueKey="count" /> : undefined}
      />
    </div>
  );
}
