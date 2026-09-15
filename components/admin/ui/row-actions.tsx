import type { ReactNode } from "react";
import { reorderAriaLabel } from "@/lib/admin/reorder-label";

/**
 * The ↑/↓ position buttons every reorderable admin list (products,
 * entities, nav items, page/shared-section blocks) repeats. `itemLabel`
 * — the block's type label, the product's name, the entity row's primary
 * column value — folds into the accessible name (see reorder-label.ts)
 * so a list of many identical-looking reorder buttons doesn't announce
 * as a wall of indistinguishable "Move up"s to a screen reader user.
 * Optional and additive: omitting it keeps the old generic "Move up"/
 * "Move down" behavior for any caller that has no natural label handy.
 */
export function ReorderButtons({
  onMoveUp,
  onMoveDown,
  disabled,
  disableUp,
  disableDown,
  itemLabel,
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
  disabled?: boolean;
  disableUp?: boolean;
  disableDown?: boolean;
  itemLabel?: string;
}) {
  return (
    <div className="flex gap-2 text-xs">
      <button
        type="button"
        onClick={onMoveUp}
        disabled={disabled || disableUp}
        className="disabled:opacity-30"
        aria-label={reorderAriaLabel("up", itemLabel)}
      >
        ↑
      </button>
      <button
        type="button"
        onClick={onMoveDown}
        disabled={disabled || disableDown}
        className="disabled:opacity-30"
        aria-label={reorderAriaLabel("down", itemLabel)}
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
