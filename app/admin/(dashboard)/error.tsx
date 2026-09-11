"use client";

import { useEffect } from "react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded border border-osi-sand-300 bg-osi-white p-8 text-center">
      <h1 className="font-display text-lg tracking-wide-display uppercase">Something went wrong</h1>
      <p className="mt-2 text-sm text-osi-slate-400">
        This screen hit an error. Your other admin sections are unaffected — try again below.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded bg-osi-navy-900 px-4 py-2 text-xs uppercase tracking-wide-label text-osi-white"
      >
        Try again
      </button>
    </div>
  );
}
