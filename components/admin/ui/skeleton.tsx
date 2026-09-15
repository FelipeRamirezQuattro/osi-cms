import type { HTMLAttributes } from "react";
import { joinClassNames } from "./styles";

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={joinClassNames(
        "animate-pulse rounded-lg bg-[var(--admin-surface-muted)]",
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}
