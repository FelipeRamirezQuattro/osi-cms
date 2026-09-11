import type { Metadata } from "next";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Reset password — OSI Admin", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-osi-navy-900 px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center font-display text-2xl tracking-wide-display text-osi-white uppercase">
          Reset password
        </h1>
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
