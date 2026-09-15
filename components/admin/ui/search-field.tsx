import { forwardRef, type InputHTMLAttributes } from "react";
import { joinClassNames } from "./styles";

export const SearchField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function SearchField({ className, ...props }, ref) {
    return (
      <span className="relative block">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--admin-ink-secondary)]"
        >
          <circle cx="9" cy="9" r="5.25" stroke="currentColor" strokeWidth="1.5" />
          <path d="m13 13 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          ref={ref}
          type="search"
          className={joinClassNames("admin-field-control pl-9", className)}
          {...props}
        />
      </span>
    );
  },
);
