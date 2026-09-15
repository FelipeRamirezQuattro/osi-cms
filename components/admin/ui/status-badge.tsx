/**
 * The rounded pill used across every admin list/editor to show a
 * published/draft (or active/disabled) state — previously duplicated,
 * pixel-for-pixel identical, across products-list.tsx, entity-list.tsx,
 * forms/page.tsx, shared-sections/page.tsx, pages/page.tsx,
 * page-editor.tsx, shared-section-editor.tsx, and users-admin.tsx
 * (Task 12).
 *
 * Tone is derived from the label itself (case-insensitive) rather than a
 * separate boolean prop, since every call site already has a status
 * string on hand ("published"/"draft", "active"/"disabled") and passing
 * that straight through keeps callers a one-liner.
 */
export function StatusBadge({ label }: { label: string }) {
  const isPositive = label.toLowerCase() === "published" || label.toLowerCase() === "active";
  return (
    <span
      className={
        isPositive
          ? "rounded bg-green-100 px-2 py-0.5 text-xs text-green-800"
          : "rounded bg-osi-sand-300/50 px-2 py-0.5 text-xs opacity-70"
      }
    >
      {label}
    </span>
  );
}
