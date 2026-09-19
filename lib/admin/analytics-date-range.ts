import type { DateRange } from "@/lib/data/analytics-reports";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_WINDOW_DAYS = 30;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Server-side date-range resolution for every /admin/analytics/* page — from/to query params, defaulting to the last 30 days ending today (Wix's own default window). */
export function resolveDateRange(rawSearchParams: Record<string, string | string[] | undefined>): DateRange {
  const from = firstValue(rawSearchParams.from);
  const to = firstValue(rawSearchParams.to);

  const today = new Date();
  const endDate = to && DATE_RE.test(to) ? to : formatDate(today);

  const defaultStart = new Date(today);
  defaultStart.setUTCDate(defaultStart.getUTCDate() - (DEFAULT_WINDOW_DAYS - 1));
  const startDate = from && DATE_RE.test(from) ? from : formatDate(defaultStart);

  return { startDate, endDate };
}
