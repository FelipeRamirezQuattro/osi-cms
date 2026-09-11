"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getBrowserAuth } from "@/lib/auth/client";

type Status = "checking" | "ready" | "expired" | "success";

const fieldClass =
  "w-full rounded border border-osi-steel-500/50 bg-transparent px-4 py-2 text-sm text-osi-white placeholder:text-osi-slate-400 focus:outline-2 focus:outline-osi-gold-500";

export function ResetPasswordForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // The recovery session lives only in the URL's hash fragment (never
  // sent to the server — see lib/auth/index.ts's comment on
  // requestPasswordReset) — this has to run client-side. Every setState
  // below goes through a promise .then(), not synchronously in the
  // effect body, to satisfy react-hooks/set-state-in-effect.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const errorCode = hash.get("error_code");
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    if (errorCode || !accessToken || !refreshToken) {
      Promise.resolve().then(() => setStatus("expired"));
      return;
    }

    getBrowserAuth()
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setStatus("expired");
          return;
        }
        // Clear the tokens out of the visible URL now that they're consumed.
        window.history.replaceState(null, "", window.location.pathname);
        setStatus("ready");
      });
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setPending(true);
    const { error: updateError } = await getBrowserAuth().updateUser({ password });
    setPending(false);

    if (updateError) {
      setError("Couldn't set the new password. Try requesting a fresh link.");
      return;
    }
    setStatus("success");
    router.push("/admin");
    router.refresh();
  }

  if (status === "checking") {
    return <p className="text-center text-sm text-osi-slate-200">Checking your link…</p>;
  }

  if (status === "expired") {
    return (
      <div className="space-y-4 rounded border border-osi-steel-500/30 bg-osi-navy-800 p-8 text-center text-sm text-osi-white">
        <p>This link is invalid or has expired.</p>
        <Link href="/admin/forgot-password" className="text-osi-gold-500 hover:underline">
          Request a new one
        </Link>
      </div>
    );
  }

  if (status === "success") {
    return <p className="text-center text-sm text-osi-slate-200">Password set — redirecting…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded border border-osi-steel-500/30 bg-osi-navy-800 p-8">
      <input name="password" type="password" placeholder="New password" required minLength={8} className={fieldClass} />
      <input name="confirm" type="password" placeholder="Confirm new password" required minLength={8} className={fieldClass} />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-osi-gold-500 py-2 font-display text-sm tracking-wide-display text-osi-navy-900 uppercase transition-colors hover:bg-osi-gold-400 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Set password"}
      </button>
    </form>
  );
}
