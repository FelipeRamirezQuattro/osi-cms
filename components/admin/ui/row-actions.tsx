import type { ReactNode } from "react";
import { reorderAriaLabel } from "@/lib/admin/reorder-label";
import { IconButton } from "./icon-button";
import { Button } from "./button";

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
      <IconButton
        onClick={onMoveUp}
        disabled={disabled || disableUp}
        className="size-9"
        aria-label={reorderAriaLabel("up", itemLabel)}
      >
        ↑
      </IconButton>
      <IconButton
        onClick={onMoveDown}
        disabled={disabled || disableDown}
        className="size-9"
        aria-label={reorderAriaLabel("down", itemLabel)}
      >
        ↓
      </IconButton>
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
    <Button
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      className={`min-h-9 px-2 text-xs ${tone === "danger" ? "text-[var(--admin-danger)]" : ""} ${className ?? ""}`}
    >
      {children}
    </Button>
  );
}
