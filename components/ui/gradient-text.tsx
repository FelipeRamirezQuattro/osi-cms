import type { ReactNode } from "react";

/**
 * Gold gradient-sweep text — navy backgrounds only. gold-500/gold-400
 * both clear WCAG AA on navy (see app/globals.css's color-token
 * comments); there is no equivalent light-safe pair for a cream
 * background, so this primitive is not used there — use a solid
 * gold-700 label instead. Used sparingly: a single eyebrow/kicker or
 * one hero word, never a full heading (gold is a scarce, load-bearing
 * accent, never body text — CLAUDE.md).
 */
export function GradientText({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-block bg-clip-text text-transparent [background-image:linear-gradient(90deg,var(--color-osi-gold-500),var(--color-osi-gold-400))] ${className}`}
    >
      {children}
    </span>
  );
}
