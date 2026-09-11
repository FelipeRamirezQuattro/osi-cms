import { requireAdminRole } from "@/lib/auth";
import { listAdminUsersAction } from "@/lib/actions/users";
import { UsersAdmin } from "@/app/admin/(dashboard)/users/users-admin";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requireAdminRole();
  const users = await listAdminUsersAction();
  return <UsersAdmin users={users} />;
}
