import { forwardRef, type InputHTMLAttributes } from "react";
import { joinClassNames } from "./styles";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input ref={ref} className={joinClassNames("admin-field-control", className)} {...props} />
    );
  },
);
