import { requireCapability } from "@/lib/auth";
import { resolveDateRange } from "@/lib/admin/analytics-date-range";
import { listSavedReports } from "@/lib/data/saved-reports";
import { getBlogActivityByTimeOfDay, getBlogActivityOverTime, getBlogTrafficSources, getTopBlogPosts } from "@/lib/data/analytics-reports";
import { AnalyticsPageHeader } from "@/components/admin/analytics/analytics-page-header";
import { ReportSection } from "@/components/admin/analytics/report-section";
import { BarChartCard, LineChartCard } from "@/components/admin/analytics/chart-card";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function BlogReportsPage({ searchParams }: Props) {
  await requireCapability("view_analytics");
  const range = resolveDateRange(await searchParams);

  const [topPosts, activityOverTime, activityByTimeOfDay, trafficSources, savedReports] = await Promise.all([
    getTopBlogPosts(range),
    getBlogActivityOverTime(range),
    getBlogActivityByTimeOfDay(range),
    getBlogTrafficSources(range),
    listSavedReports(),
  ]);

  const isSaved = (key: string) => savedReports.includes(key);

  return (
    <div className="space-y-8">
      <AnalyticsPageHeader title="Blog" description="See how visitors are engaging with your news posts." range={range} />

      <ReportSection
        reportKey="top_blog_posts"
        title="Top Blog Posts"
        isSaved={isSaved("top_blog_posts")}
        chart={topPosts.length > 0 ? <BarChartCard data={topPosts} labelKey="path" valueKey="pageViews" /> : undefined}
      />

      <ReportSection
        reportKey="blog_activity_over_time"
        title="Blog Activity over Time"
        isSaved={isSaved("blog_activity_over_time")}
        chart={<LineChartCard data={activityOverTime} xKey="date" yKey="count" />}
      />

      <ReportSection
        reportKey="blog_activity_by_time_of_day"
        title="Blog Activity by Time of Day"
        description="Hours are in UTC."
        isSaved={isSaved("blog_activity_by_time_of_day")}
        chart={
          <BarChartCard
            data={activityByTimeOfDay.map((r) => ({ ...r, hourLabel: `${r.hour}:00` }))}
            labelKey="hourLabel"
            valueKey="count"
          />
        }
      />

      <ReportSection
        reportKey="blog_traffic_sources"
        title="Blog Traffic Sources"
        isSaved={isSaved("blog_traffic_sources")}
        chart={trafficSources.length > 0 ? <BarChartCard data={trafficSources} labelKey="source" valueKey="pageViews" /> : undefined}
      />
    </div>
  );
}
