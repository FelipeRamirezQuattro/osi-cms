import type { ReactNode } from "react";
import { IconButton } from "./icon-button";
import { joinClassNames } from "./styles";

export type AlertTone = "error" | "warning" | "info" | "success";

const TONE: Record<AlertTone, { icon: string; border: string; background: string; ink: string; label: string }> = {
  error: { icon: "!", border: "var(--admin-danger)", background: "var(--admin-danger-soft)", ink: "var(--admin-danger)", label: "Error" },
  warning: { icon: "!", border: "var(--admin-warning)", background: "var(--admin-warning-soft)", ink: "var(--admin-warning)", label: "Warning" },
  info: { icon: "i", border: "var(--admin-info)", background: "var(--admin-info-soft)", ink: "var(--admin-info)", label: "Notice" },
  success: { icon: "✓", border: "var(--admin-success)", background: "var(--admin-success-soft)", ink: "var(--admin-success)", label: "Success" },
};

/** Icon + tone colours shared by Alert and AlertDialog so both read as the same component. */
export function AlertIcon({ tone }: { tone: AlertTone }) {
  const t = TONE[tone];
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
      style={{ background: t.ink }}
    >
      {t.icon}
    </span>
  );
}

/**
 * The admin's inline alert: something the editor needs to see and act on,
 * rendered next to the thing it's about (above a block list, inside a form)
 * instead of as a line of text at the top of the page. Errors and warnings
 * are `role="alert"` (announced immediately); info/success are polite
 * `role="status"`. Optional `details` lists each problem; `actions` holds
 * the way forward (e.g. "Go to block"); `onDismiss` adds a close button.
 */
export function Alert({
  tone = "error",
  title,
  children,
  details,
  actions,
  onDismiss,
  className,
}: {
  tone?: AlertTone;
  title: string;
  children?: ReactNode;
  details?: string[];
  actions?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const t = TONE[tone];
  const urgent = tone === "error" || tone === "warning";
  return (
    <div
      role={urgent ? "alert" : "status"}
      data-alert-tone={tone}
      className={joinClassNames("flex items-start gap-3 rounded-[var(--admin-radius-control)] border border-l-4 p-3 text-sm", className)}
      style={{ background: t.background, borderColor: t.border, color: "var(--admin-ink)" }}
    >
      <AlertIcon tone={tone} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-semibold">
          <span className="sr-only">{t.label}: </span>
          {title}
        </p>
        {children && <div className="text-[var(--admin-ink-secondary)]">{children}</div>}
        {details && details.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-5 text-[var(--admin-ink-secondary)]">
            {details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
        {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
      </div>
      {onDismiss && (
        <IconButton aria-label="Dismiss" onClick={onDismiss} className="-m-2 size-9 shrink-0">
          <span aria-hidden="true" className="text-lg leading-none">
            ×
          </span>
        </IconButton>
      )}
    </div>
  );
}
