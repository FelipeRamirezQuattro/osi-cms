"use client";

import { useEffect } from "react";

/**
 * Boundary for the admin screens that sit outside `(dashboard)` — sign-in,
 * forgot/reset password, the email-link confirm page. Without it an error
 * there fell through to the root global-error ("temporarily unavailable"),
 * which has no way back. A full reload is the right recovery here: the usual
 * cause is a tab left open across a deploy, which a soft `reset()` can't fix.
 */
export default function AdminAuthError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-osi-navy-900 px-6">
      <div className="w-full max-w-sm space-y-4 rounded border border-osi-steel-500/30 bg-osi-navy-800 p-8 text-center text-sm text-osi-white">
        <h1 className="font-display text-lg tracking-wide-display uppercase">Something went wrong</h1>
        <p className="text-osi-slate-200">
          This page may be out of date. Reload to continue — your account and content are unaffected.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full rounded bg-osi-gold-500 py-2 font-display text-sm tracking-wide-display text-osi-navy-900 uppercase transition-colors hover:bg-osi-gold-400"
        >
          Reload
        </button>
        {/* Plain anchor on purpose: a stale client router is the likely cause, so force a real navigation. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/admin/login" className="block text-xs text-osi-slate-200 hover:underline">
          Back to sign in
        </a>
      </div>
    </div>
  );
}
