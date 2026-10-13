"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requestPasswordReset, signInWithPassword, signOutCurrentUser, verifyEmailToken } from "@/lib/auth";
import { siteUrl } from "@/lib/seo";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type LoginState = { status: "idle" | "error"; message?: string };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email and password." };
  }

  const { error } = await signInWithPassword(parsed.data.email, parsed.data.password);
  if (error) {
    return { status: "error", message: "Invalid email or password." };
  }

  redirect("/admin");
}

export async function logoutAction() {
  await signOutCurrentUser();
  redirect("/admin/login");
}

export type ForgotPasswordState = { status: "idle" | "sent" | "error"; message?: string };

export async function forgotPasswordAction(
  _prevState: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const parsed = z.string().email().safeParse(formData.get("email"));
  if (!parsed.success) {
    return { status: "error", message: "Enter a valid email address." };
  }

  // Always report success either way — confirming/denying whether an
  // email has an admin account would let anyone enumerate staff emails.
  await requestPasswordReset(parsed.data, `${siteUrl()}/admin/reset-password`);
  return { status: "sent" };
}

const EMAIL_TOKEN_TYPES = ["recovery", "invite"] as const;

/**
 * The button-press half of the token-hash email flow (password reset and
 * staff invite). Verifying here, on a POST, rather than on the page's GET
 * is the whole point: mail scanners prefetch links and would consume a
 * one-time token before the person clicks it.
 */
export async function confirmEmailTokenAction(formData: FormData) {
  const tokenHash = formData.get("token_hash");
  const type = formData.get("type");
  if (
    typeof tokenHash !== "string" ||
    tokenHash.length === 0 ||
    typeof type !== "string" ||
    !(EMAIL_TOKEN_TYPES as readonly string[]).includes(type)
  ) {
    redirect("/admin/forgot-password?expired=1");
  }

  const { error } = await verifyEmailToken(tokenHash, type as (typeof EMAIL_TOKEN_TYPES)[number]);
  if (error) redirect("/admin/forgot-password?expired=1");

  redirect("/admin/reset-password");
}
