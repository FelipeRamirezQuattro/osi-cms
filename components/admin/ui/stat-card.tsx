import Link from "next/link";

/** A single KPI tile linking to its detail view — shared by the admin dashboard and the analytics overview. */
export function StatCard({ value, label, href }: { value: string | number; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="admin-card group block p-4 hover:-translate-y-0.5 hover:border-[var(--admin-border-strong)] hover:shadow-md sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
          <p className="mt-1 text-sm text-[var(--admin-ink-secondary)]">{label}</p>
        </div>
        <span
          className="mt-1 text-[var(--admin-ink-secondary)] transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        >
          →
        </span>
      </div>
      <span className="sr-only">View {label.toLowerCase()}</span>
    </Link>
  );
}
