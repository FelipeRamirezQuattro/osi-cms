import type { ReactNode } from "react";
import Link from "next/link";

/**
 * The title row every /admin screen opens with — "Title" + a right-aligned
 * action cluster (a "New X" button, or an editor's status badge/save/
 * publish buttons), optionally preceded by a "← Back" link and followed by
 * a subtitle/description line. Shared by both server-rendered list pages
 * (pages/shared-sections/forms) and client editors (page-editor,
 * shared-section-editor) — it has no hooks, so it works in either.
 */
export function AdminPageHeader({
  title,
  subtitle,
  description,
  backHref,
  backLabel,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        {backHref && (
          <Link href={backHref} className="block text-xs opacity-60 hover:underline">
            ← {backLabel}
          </Link>
        )}
        <h1 className="font-display text-lg tracking-wide-display uppercase">{title}</h1>
        {subtitle && <p className="text-xs opacity-50">{subtitle}</p>}
        {description && <p className="mt-1 max-w-2xl text-sm opacity-70">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/** The consistent "New product" / "New form" / etc. link-button used in every list page's header actions. */
export function AdminNewLinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="rounded bg-osi-navy-900 px-4 py-2 text-xs uppercase tracking-wide-label text-osi-white">
      {children}
    </Link>
  );
}
