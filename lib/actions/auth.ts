"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { signInWithPassword, signOutCurrentUser } from "@/lib/auth";

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
