"use client";

import { useCallback, useMemo, type ChangeEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/admin/ui/select";

const PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
] as const;

const DEFAULT_DAYS = 30;

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function presetRange(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - (days - 1));
  return { from: formatDate(from), to: formatDate(to) };
}

/** Every /admin/analytics/* page's date-range control — writes `from`/`to` into the URL (same "state lives in the URL" pattern as useListQueryState), which re-runs the Server Component's data fetch on navigation. */
export function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const currentDays = useMemo(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (!from || !to) return DEFAULT_DAYS;
    const diffDays = Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86_400_000) + 1;
    return PRESETS.some((preset) => preset.days === diffDays) ? diffDays : DEFAULT_DAYS;
  }, [searchParams]);

  const handleChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const { from, to } = presetRange(Number(event.target.value));
      const params = new URLSearchParams(searchParamsString);
      params.set("from", from);
      params.set("to", to);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParamsString],
  );

  return (
    <Select value={currentDays} onChange={handleChange} aria-label="Date range" className="w-auto">
      {PRESETS.map((preset) => (
        <option key={preset.days} value={preset.days}>
          {preset.label}
        </option>
      ))}
    </Select>
  );
}
