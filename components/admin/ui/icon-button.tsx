import { forwardRef, type ButtonHTMLAttributes } from "react";
import { joinClassNames } from "./styles";

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function IconButton({ className, type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={joinClassNames(
          "inline-flex size-11 items-center justify-center rounded-[var(--admin-radius-control)] text-current hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);
