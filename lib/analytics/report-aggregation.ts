// Pure aggregation/formatting helpers shared by every report in
// lib/data/analytics-reports.ts — split out from that file so this
// bucketing/labeling logic is unit-testable without a DB.

export function countByKey<T>(rows: T[], keyFn: (row: T) => string | null): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = keyFn(row);
    if (key === null) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

export function seriesByDate<T>(rows: T[], dateFn: (row: T) => string): Array<{ date: string; count: number }> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const date = dateFn(row).slice(0, 10);
    counts.set(date, (counts.get(date) ?? 0) + 1);
  }
  return [...counts.entries()].map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
}

export function seriesByHour(rows: Array<{ created_at: string }>): Array<{ hour: number; count: number }> {
  const counts = new Array(24).fill(0);
  for (const row of rows) {
    counts[new Date(row.created_at).getUTCHours()]++;
  }
  return counts.map((count, hour) => ({ hour, count }));
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** e.g. "Direct", "Google.com (Organic)", "linkedin.com (Social)" — matches the legacy Wix dashboard's source labeling. */
export function trafficSourceLabel(row: { referrer_host: string | null; traffic_category: string }): string {
  if (!row.referrer_host) return "Direct";
  const host = row.referrer_host.replace(/^www\./, "");
  if (row.traffic_category === "organic") return `${capitalize(host)} (Organic)`;
  if (row.traffic_category === "social") return `${capitalize(host)} (Social)`;
  if (row.traffic_category === "paid") return `${capitalize(host)} (Paid)`;
  return host;
}

export function isBlogPath(path: string): boolean {
  return path === "/news" || path.startsWith("/news/") || path === "/blog" || path.startsWith("/blog/");
}
