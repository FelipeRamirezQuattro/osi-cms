/**
 * Every report key used across app/admin/(dashboard)/analytics/*, in one
 * place — the single source of truth the Overview page's saved-reports
 * quick-access list resolves labels/links from. Keep this in lockstep
 * with the `reportKey` passed to each ReportSection.
 */
export type AnalyticsReportCatalogEntry = { key: string; label: string; category: string; href: string };

export const ANALYTICS_REPORT_CATALOG: AnalyticsReportCatalogEntry[] = [
  { key: "traffic_over_time", label: "Traffic over Time", category: "Traffic", href: "/admin/analytics/traffic" },
  { key: "traffic_by_location", label: "Traffic by Location", category: "Traffic", href: "/admin/analytics/traffic" },
  { key: "traffic_by_time_of_day", label: "Traffic by Time of Day", category: "Traffic", href: "/admin/analytics/traffic" },

  { key: "button_clicks", label: "Button Clicks", category: "Behavior", href: "/admin/analytics/behavior" },
  { key: "button_clicks_over_time", label: "Button Clicks over Time", category: "Behavior", href: "/admin/analytics/behavior" },
  { key: "page_visits", label: "Page Visits", category: "Behavior", href: "/admin/analytics/behavior" },
  { key: "submissions_by_form", label: "Submissions by Form", category: "Behavior", href: "/admin/analytics/behavior" },
  { key: "form_submissions_over_time", label: "Form Submissions over Time", category: "Behavior", href: "/admin/analytics/behavior" },
  { key: "top_searches", label: "Top Searches", category: "Behavior", href: "/admin/analytics/behavior" },
  { key: "searches_with_no_results", label: "Searches with No Results", category: "Behavior", href: "/admin/analytics/behavior" },
  { key: "searches_over_time", label: "Searches over Time", category: "Behavior", href: "/admin/analytics/behavior" },
  { key: "clicks_to_contact_over_time", label: "Clicks-to-Contact over Time", category: "Behavior", href: "/admin/analytics/behavior" },

  { key: "traffic_categories_over_time", label: "Traffic Categories over Time", category: "Marketing", href: "/admin/analytics/marketing" },
  { key: "top_traffic_sources", label: "Top Traffic Sources", category: "Marketing", href: "/admin/analytics/marketing" },
  {
    key: "form_submissions_by_traffic_source",
    label: "Form Submissions by Traffic Source",
    category: "Marketing",
    href: "/admin/analytics/marketing",
  },
  { key: "paid_ad_campaigns_over_time", label: "Paid Ad Campaigns over Time", category: "Marketing", href: "/admin/analytics/marketing" },
  { key: "top_paid_ad_campaigns", label: "Top Paid Ad Campaigns", category: "Marketing", href: "/admin/analytics/marketing" },

  {
    key: "google_search_performance_over_time",
    label: "Google Search Performance over Time",
    category: "SEO",
    href: "/admin/analytics/seo",
  },
  { key: "top_search_queries_google", label: "Top Search Queries on Google", category: "SEO", href: "/admin/analytics/seo" },
  { key: "top_pages_google_search", label: "Top Pages in Google Search Results", category: "SEO", href: "/admin/analytics/seo" },
  { key: "average_position_over_time", label: "Average Position in Google over Time", category: "SEO", href: "/admin/analytics/seo" },
  { key: "bot_traffic_over_time", label: "Bot Traffic over Time", category: "SEO", href: "/admin/analytics/seo" },
  { key: "bot_visits_by_page", label: "Bot Visits by Page", category: "SEO", href: "/admin/analytics/seo" },
  { key: "ai_bot_visits_by_page", label: "AI Bot Visits by Page", category: "SEO", href: "/admin/analytics/seo" },
  { key: "ai_bot_traffic_over_time", label: "AI Bot Traffic over Time", category: "SEO", href: "/admin/analytics/seo" },

  { key: "top_blog_posts", label: "Top Blog Posts", category: "Blog", href: "/admin/analytics/blog" },
  { key: "blog_activity_over_time", label: "Blog Activity over Time", category: "Blog", href: "/admin/analytics/blog" },
  { key: "blog_activity_by_time_of_day", label: "Blog Activity by Time of Day", category: "Blog", href: "/admin/analytics/blog" },
  { key: "blog_traffic_sources", label: "Blog Traffic Sources", category: "Blog", href: "/admin/analytics/blog" },

  { key: "new_vs_returning_visitors", label: "New vs. Returning Visitors", category: "People", href: "/admin/analytics/people" },
  { key: "contacts_over_time", label: "Contacts over Time", category: "People", href: "/admin/analytics/people" },
  { key: "form_leads", label: "Form Leads", category: "People", href: "/admin/analytics/people" },
  { key: "contacts_by_source", label: "Contacts by Source", category: "People", href: "/admin/analytics/people" },
];
