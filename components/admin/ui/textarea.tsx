import { forwardRef, type TextareaHTMLAttributes } from "react";
import { joinClassNames } from "./styles";

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={joinClassNames("admin-field-control min-h-28 resize-y", className)}
      {...props}
    />
  );
});
