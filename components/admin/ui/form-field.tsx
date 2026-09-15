import type { ReactNode } from "react";

export function FormField({
  label,
  htmlFor,
  help,
  error,
  children,
  className,
}: {
  label: ReactNode;
  htmlFor?: string;
  help?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="admin-field-label">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1.5 text-xs text-[var(--admin-danger)]" role="alert">
          {error}
        </p>
      ) : help ? (
        <p className="admin-field-help mt-1.5">{help}</p>
      ) : null}
    </div>
  );
}
