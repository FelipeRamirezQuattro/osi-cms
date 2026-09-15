import type { ReactNode } from "react";

/**
 * The "nothing here yet" message every admin list falls back to.
 * Standalone (not just AdminDataTable's internal default) so a
 * non-tabular admin screen can reach for the same look.
 */
export function EmptyState({ message, className = "px-4 py-6" }: { message: ReactNode; className?: string }) {
  return <p className={`text-center opacity-50 ${className}`}>{message}</p>;
}
