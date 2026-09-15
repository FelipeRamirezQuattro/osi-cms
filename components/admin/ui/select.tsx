import { forwardRef, type SelectHTMLAttributes } from "react";
import { joinClassNames } from "./styles";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return (
      <select ref={ref} className={joinClassNames("admin-field-control", className)} {...props} />
    );
  },
);
