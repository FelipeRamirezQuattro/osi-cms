"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/actions/auth";
import { AsyncMessage } from "@/components/admin/ui/async-message";

const initialState: LoginState = { status: "idle" };

const fieldClass =
  "w-full rounded border border-osi-steel-500/50 bg-transparent px-4 py-2 text-sm text-osi-white placeholder:text-osi-slate-400 focus:outline-2 focus:outline-osi-gold-500";
const labelClass = "block space-y-1 text-sm text-osi-slate-200";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded border border-osi-steel-500/30 bg-osi-navy-800 p-8">
      <label className={labelClass} htmlFor="login-email">
        <span className="block text-xs uppercase tracking-wide-label">Email</span>
        <input
          id="login-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          spellCheck={false}
          placeholder="you@company.com"
          required
          className={fieldClass}
        />
      </label>
      <label className={labelClass} htmlFor="login-password">
        <span className="block text-xs uppercase tracking-wide-label">Password</span>
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          spellCheck={false}
          placeholder="Password"
          required
          className={fieldClass}
        />
      </label>
      <AsyncMessage
        variant="dark"
        message={state.status === "error" ? { kind: "error", text: state.message ?? "Something went wrong." } : null}
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-osi-gold-500 py-2 font-display text-sm tracking-wide-display text-osi-navy-900 uppercase transition-colors hover:bg-osi-gold-400 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <Link href="/admin/forgot-password" className="block text-center text-xs text-osi-slate-200 hover:underline">
        Forgot password?
      </Link>
    </form>
  );
}
