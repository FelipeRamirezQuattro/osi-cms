/**
 * Bootstraps admin access — there's no public signup (master prompt
 * §2), so the first (and any subsequent, before /admin/users exists to
 * do it in-app) admin_profiles row is created here. Invites the user
 * via Supabase Auth's admin API (they get an email with a link to set
 * their password); if the auth user already exists, just upserts their
 * admin_profiles row instead of re-inviting.
 *
 * Usage: pnpm create-admin <email> [--role=admin|editor] [--name="Full Name"] [--redirect=<url>] [--link [--site=<origin>]]
 *
 * --link sends NO email. It prints a one-time sign-in link for you to deliver yourself (chat, in
 * person). Use it when Supabase's email can't be relied on (default SMTP limits, scanners that
 * open links, templates that can't be edited). The link opens /admin/auth/confirm, which only
 * uses the token when its button is pressed, then lets the person set a password. It expires
 * (Supabase's OTP lifetime, 1 hour by default) — generate it when you're about to send it.
 *
 * The invite link lands on --redirect (default: the production /admin/reset-password page, which
 * must be in Supabase → Auth → Redirect URLs). With the token-hash email template the link goes to
 * /admin/auth/confirm instead and this value is unused.
 */
import { createServiceRoleDbClient } from "../lib/db/client";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error('Usage: pnpm create-admin <email> [--role=admin|editor] [--name="Full Name"]');
    process.exit(1);
  }
  const role = (process.argv.find((a) => a.startsWith("--role="))?.split("=")[1] ??
    "admin") as "admin" | "editor";
  const fullName = process.argv.find((a) => a.startsWith("--name="))?.split("=")[1];
  const redirectTo =
    process.argv.find((a) => a.startsWith("--redirect="))?.slice("--redirect=".length) ??
    "https://osi-cms.vercel.app/admin/reset-password";

  const wantLink = process.argv.includes("--link");
  const site = process.argv.find((a) => a.startsWith("--site="))?.slice("--site=".length) ?? "https://osi-cms.vercel.app";

  const db = createServiceRoleDbClient();

  async function upsertProfile(userId: string) {
    const { error } = await db
      .from("admin_profiles")
      .upsert({ user_id: userId, role, full_name: fullName, is_active: true }, { onConflict: "user_id" });
    if (error) throw error;
  }

  if (wantLink) {
    // A brand-new user gets an 'invite' link; one that already exists (e.g. invited by email before) gets
    // a 'recovery' link — both verify through the same button-press page and end at "set a password".
    let type: "invite" | "recovery" = "invite";
    let res = await db.auth.admin.generateLink({ type: "invite", email, options: { redirectTo } });
    if (res.error) {
      type = "recovery";
      res = await db.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
    }
    if (res.error || !res.data?.properties?.hashed_token) throw res.error ?? new Error("No token returned");
    await upsertProfile(res.data.user.id);
    console.log(`\n${email} (role=${role}) — no email was sent. Send this link privately; it works once:\n`);
    console.log(`${site}/admin/auth/confirm?token_hash=${res.data.properties.hashed_token}&type=${type}\n`);
    return;
  }

  const { data, error } = await db.auth.admin.inviteUserByEmail(email, { redirectTo });

  if (error) {
    if (!error.message.toLowerCase().includes("already")) throw error;
    const { data: list, error: listError } = await db.auth.admin.listUsers();
    if (listError) throw listError;
    const existing = list.users.find((u) => u.email === email);
    if (!existing) throw error;
    await upsertProfile(existing.id);
    console.log(`User already existed — upserted admin_profiles for ${email} (role=${role}).`);
    return;
  }

  await upsertProfile(data.user.id);
  console.log(
    `Invited ${email} and created admin_profiles (role=${role}). They'll get a Supabase auth email to set their password.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
