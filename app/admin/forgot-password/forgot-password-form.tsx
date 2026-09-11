"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, type ForgotPasswordState } from "@/lib/actions/auth";

const initialState: ForgotPasswordState = { status: "idle" };

const fieldClass =
  "w-full rounded border border-osi-steel-500/50 bg-transparent px-4 py-2 text-sm text-osi-white placeholder:text-osi-slate-400 focus:outline-2 focus:outline-osi-gold-500";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, initialState);

  if (state.status === "sent") {
    return (
      <div className="space-y-4 rounded border border-osi-steel-500/30 bg-osi-navy-800 p-8 text-center text-sm text-osi-white">
        <p>If that email has an admin account, a reset link is on its way. Check your inbox.</p>
        <Link href="/admin/login" className="text-osi-gold-500 hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded border border-osi-steel-500/30 bg-osi-navy-800 p-8">
      <input name="email" type="email" placeholder="Email" required className={fieldClass} />
      {state.status === "error" && <p className="text-sm text-red-400">{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-osi-gold-500 py-2 font-display text-sm tracking-wide-display text-osi-navy-900 uppercase transition-colors hover:bg-osi-gold-400 disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
      <Link href="/admin/login" className="block text-center text-xs text-osi-slate-200 hover:underline">
        Back to sign in
      </Link>
    </form>
  );
}
