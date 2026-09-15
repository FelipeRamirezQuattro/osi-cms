"use client";

import { useEffect } from "react";
import { Button } from "@/components/admin/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="admin-card mx-auto max-w-xl p-8 text-center sm:p-10">
      <div
        className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-[var(--admin-danger-soft)] text-[var(--admin-danger)]"
        aria-hidden="true"
      >
        !
      </div>
      <h1 className="text-xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-sm text-[var(--admin-ink-secondary)]">
        This screen hit an error. Your other admin sections are unaffected — try again below.
      </p>
      <Button onClick={reset} className="mt-6">
        Try again
      </Button>
    </div>
  );
}
