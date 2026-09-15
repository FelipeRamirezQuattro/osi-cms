import { forwardRef, type ButtonHTMLAttributes } from "react";
import { joinClassNames } from "./styles";

export type AdminButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function adminButtonClassName(variant: AdminButtonVariant = "primary", className?: string) {
  return joinClassNames("admin-button", `admin-button--${variant}`, className);
}

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: AdminButtonVariant }
>(function Button({ variant = "primary", className, type = "button", ...props }, ref) {
  return (
    <button ref={ref} type={type} className={adminButtonClassName(variant, className)} {...props} />
  );
});
