"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/actions/auth";

const initialState: LoginState = { status: "idle" };

const fieldClass =
  "w-full rounded border border-osi-steel-500/50 bg-transparent px-4 py-2 text-sm text-osi-white placeholder:text-osi-slate-400 focus:outline-2 focus:outline-osi-gold-500";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded border border-osi-steel-500/30 bg-osi-navy-800 p-8">
      <input name="email" type="email" placeholder="Email" required className={fieldClass} />
      <input name="password" type="password" placeholder="Password" required className={fieldClass} />
      {state.status === "error" && <p className="text-sm text-red-400">{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-osi-gold-500 py-2 font-display text-sm tracking-wide-display text-osi-navy-900 uppercase transition-colors hover:bg-osi-gold-400 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
