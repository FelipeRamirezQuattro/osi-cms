import type { HTMLAttributes } from "react";
import { joinClassNames } from "./styles";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={joinClassNames("admin-card", className)} {...props} />;
}
