import { requireCapability } from "@/lib/auth";
import { resolveDateRange } from "@/lib/admin/analytics-date-range";
import { listSavedReports } from "@/lib/data/saved-reports";
import { getAiBotTrafficOverTime, getAiBotVisitsByPage, getBotTrafficOverTime, getBotVisitsByPage } from "@/lib/data/analytics-reports";
import { getSearchPerformanceOverTime, getTopPagesInSearchResults, getTopSearchQueries } from "@/lib/data/seo-search-console";
import { AnalyticsPageHeader } from "@/components/admin/analytics/analytics-page-header";
import { ReportSection } from "@/components/admin/analytics/report-section";
import { BarChartCard, LineChartCard } from "@/components/admin/analytics/chart-card";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** GSC credentials aren't provisioned yet in every environment — a missing/invalid service account must degrade this one section, not crash a page that also shows real bot-traffic data. */
async function safeGsc<T>(fetcher: () => Promise<T>): Promise<T | null> {
  try {
    return await fetcher();
  } catch (err) {
    console.error("[admin/analytics/seo] Google Search Console call failed:", err);
    return null;
  }
}

function GscUnavailableNotice() {
  return (
    <p className="rounded-lg bg-[var(--admin-warning-soft)] p-3 text-sm text-[var(--admin-warning)]">
      Google Search Console isn&apos;t connected yet — set <code>GSC_SERVICE_ACCOUNT_EMAIL</code>,{" "}
      <code>GSC_SERVICE_ACCOUNT_PRIVATE_KEY</code>, and <code>GSC_SITE_URL</code>, then verify with{" "}
      <code>pnpm verify:gsc</code>.
    </p>
  );
}

export default async function SeoReportsPage({ searchParams }: Props) {
  await requireCapability("view_analytics");
  const range = resolveDateRange(await searchParams);

  const [searchPerformance, topQueries, topPages, botOverTime, botByPage, aiBotByPage, aiBotOverTime, savedReports] = await Promise.all([
    safeGsc(() => getSearchPerformanceOverTime(range)),
    safeGsc(() => getTopSearchQueries(range)),
    safeGsc(() => getTopPagesInSearchResults(range)),
    getBotTrafficOverTime(range),
    getBotVisitsByPage(range),
    getAiBotVisitsByPage(range),
    getAiBotTrafficOverTime(range),
    listSavedReports(),
  ]);

  const isSaved = (key: string) => savedReports.includes(key);

  return (
    <div className="space-y-8">
      <AnalyticsPageHeader
        title="SEO"
        description="Learn what queries bring you traffic from Google, and see how AI platforms and search engines crawl your site."
        range={range}
      />

      <ReportSection
        reportKey="google_search_performance_over_time"
        title="Google Search Performance over Time"
        isSaved={isSaved("google_search_performance_over_time")}
        chart={searchPerformance && searchPerformance.length > 0 ? <LineChartCard data={searchPerformance} xKey="date" yKey="clicks" /> : <GscUnavailableNotice />}
      />

      <ReportSection
        reportKey="top_search_queries_google"
        title="Top Search Queries on Google"
        isSaved={isSaved("top_search_queries_google")}
        chart={
          topQueries && topQueries.length > 0 ? (
            <BarChartCard data={topQueries} labelKey="query" valueKey="clicks" />
          ) : (
            <GscUnavailableNotice />
          )
        }
      />

      <ReportSection
        reportKey="top_pages_google_search"
        title="Top Pages in Google Search Results"
        isSaved={isSaved("top_pages_google_search")}
        chart={
          topPages && topPages.length > 0 ? <BarChartCard data={topPages} labelKey="page" valueKey="clicks" /> : <GscUnavailableNotice />
        }
      />

      <ReportSection
        reportKey="average_position_over_time"
        title="Average Position in Google over Time"
        isSaved={isSaved("average_position_over_time")}
        chart={
          searchPerformance && searchPerformance.length > 0 ? (
            <LineChartCard data={searchPerformance} xKey="date" yKey="position" />
          ) : (
            <GscUnavailableNotice />
          )
        }
      />

      <ReportSection
        reportKey="bot_traffic_over_time"
        title="Bot Traffic over Time"
        isSaved={isSaved("bot_traffic_over_time")}
        chart={<LineChartCard data={botOverTime} xKey="date" yKey="count" />}
      />

      <ReportSection
        reportKey="bot_visits_by_page"
        title="Bot Visits by Page"
        isSaved={isSaved("bot_visits_by_page")}
        chart={botByPage.length > 0 ? <BarChartCard data={botByPage} labelKey="path" valueKey="count" /> : undefined}
      />

      <ReportSection
        reportKey="ai_bot_visits_by_page"
        title="AI Bot Visits by Page"
        description="ChatGPT, Perplexity, Claude, and similar AI-crawler user agents."
        isSaved={isSaved("ai_bot_visits_by_page")}
        chart={aiBotByPage.length > 0 ? <BarChartCard data={aiBotByPage} labelKey="path" valueKey="count" /> : undefined}
      />

      <ReportSection
        reportKey="ai_bot_traffic_over_time"
        title="AI Bot Traffic over Time"
        isSaved={isSaved("ai_bot_traffic_over_time")}
        chart={<LineChartCard data={aiBotOverTime} xKey="date" yKey="count" />}
      />
    </div>
  );
}
