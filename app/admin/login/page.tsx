import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in — OSI Admin", robots: { index: false } };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const params = await searchParams;
  const notAuthorized = params.error === "not-authorized";

  return (
    <div className="flex min-h-screen items-center justify-center bg-osi-navy-900 px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center font-display text-2xl tracking-wide-display text-osi-white uppercase">
          OSI Admin
        </h1>
        {notAuthorized && (
          <p className="mb-4 rounded border border-red-400/40 bg-red-400/10 p-3 text-sm text-red-300">
            Your account isn&rsquo;t set up for admin access yet.
          </p>
        )}
        <LoginForm />
      </div>
    </div>
  );
}
