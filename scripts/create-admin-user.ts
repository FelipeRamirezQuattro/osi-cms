/**
 * Bootstraps admin access — there's no public signup (master prompt
 * §2), so the first (and any subsequent, before /admin/users exists to
 * do it in-app) admin_profiles row is created here. Invites the user
 * via Supabase Auth's admin API (they get an email with a link to set
 * their password); if the auth user already exists, just upserts their
 * admin_profiles row instead of re-inviting.
 *
 * Usage: pnpm create-admin <email> [--role=admin|editor] [--name="Full Name"]
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

  const db = createServiceRoleDbClient();

  async function upsertProfile(userId: string) {
    const { error } = await db
      .from("admin_profiles")
      .upsert({ user_id: userId, role, full_name: fullName, is_active: true }, { onConflict: "user_id" });
    if (error) throw error;
  }

  const { data, error } = await db.auth.admin.inviteUserByEmail(email);

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
