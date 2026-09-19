import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { DateRangePicker } from "@/components/admin/analytics/date-range-picker";
import type { DateRange } from "@/lib/data/analytics-reports";

export function AnalyticsPageHeader({
  title,
  description,
  range,
}: {
  title: string;
  description: string;
  range: DateRange;
}) {
  return (
    <AdminPageHeader
      title={title}
      description={description}
      subtitle={`${range.startDate} – ${range.endDate}`}
      backHref="/admin/analytics"
      backLabel="All reports"
      actions={<DateRangePicker />}
    />
  );
}
