import type { Metadata } from "next";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Set a new password — OSI Admin", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-osi-navy-900 px-6">
      <div className="w-full max-w-sm">
        <h1 className="mb-8 text-center font-display text-2xl tracking-wide-display text-osi-white uppercase">
          Set a new password
        </h1>
        <ResetPasswordForm />
      </div>
    </div>
  );
}
