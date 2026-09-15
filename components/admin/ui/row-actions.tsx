import type { ReactNode } from "react";

/** The ↑/↓ position buttons every reorderable admin list (products, entities, nav items) repeats. */
export function ReorderButtons({
  onMoveUp,
  onMoveDown,
  disabled,
  disableUp,
  disableDown,
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
  disabled?: boolean;
  disableUp?: boolean;
  disableDown?: boolean;
}) {
  return (
    <div className="flex gap-2 text-xs">
      <button type="button" onClick={onMoveUp} disabled={disabled || disableUp} className="disabled:opacity-30" aria-label="Move up">
        ↑
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={disabled || disableDown}
        className="disabled:opacity-30"
        aria-label="Move down"
      >
        ↓
      </button>
    </div>
  );
}

/** A small text-link-styled row action (Delete/Edit/Disable/…), with an optional "danger" tone for destructive actions. */
export function RowActionButton({
  onClick,
  disabled,
  tone = "default",
  children,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`text-xs hover:underline disabled:opacity-40 ${tone === "danger" ? "text-red-600" : ""} ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
