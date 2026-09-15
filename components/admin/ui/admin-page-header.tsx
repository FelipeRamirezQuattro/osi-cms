import type { MouseEvent, ReactNode } from "react";
import Link from "next/link";
import { adminButtonClassName } from "./button";

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
  onBackClick,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  description?: ReactNode;
  backHref?: string;
  backLabel?: string;
  /**
   * Optional click interceptor for the back link (Task 13b's unsaved-
   * changes guard) — e.g. `page-editor.tsx` calls `event.preventDefault()`
   * and shows a ConfirmDialog when the form is dirty, only navigating on
   * confirm. Omit for the plain-navigation behavior every other caller
   * (list pages, non-editor forms) still wants.
   */
  onBackClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  actions?: ReactNode;
}) {
  return (
    <div className="admin-page-header">
      <div>
        {backHref && (
          <Link
            href={backHref}
            onClick={onBackClick}
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--admin-ink-secondary)] hover:text-[var(--admin-ink)]"
          >
            ← {backLabel}
          </Link>
        )}
        <h1 className="admin-page-title">{title}</h1>
        {subtitle && <p className="mt-1 text-xs text-[var(--admin-ink-secondary)]">{subtitle}</p>}
        {description && <p className="admin-page-description">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** The consistent "New product" / "New form" / etc. link-button used in every list page's header actions. */
export function AdminNewLinkButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={adminButtonClassName("primary")}>
      {children}
    </Link>
  );
}
