"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPageview } from "@/lib/analytics/track-event";

// Mounted once in app/(site)/layout.tsx. Fires on the initial load and
// every subsequent client-side route transition (usePathname() + an
// effect keyed on it, not a mount-only effect — a mount-only effect
// would miss every <Link> navigation after the first). Self-excludes
// /preview/* so staff previewing draft content never pollutes visitor
// counts.
export function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/preview/")) return;
    trackPageview();
  }, [pathname]);

  return null;
}
