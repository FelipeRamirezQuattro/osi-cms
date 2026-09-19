import { createServerDbClient } from "@/lib/db/client";

/** Per-admin-user "star this report" quick access (Wix's bookmark icon). */
export async function listSavedReports(): Promise<string[]> {
  const db = createServerDbClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return [];

  const { data, error } = await db.from("admin_saved_reports").select("report_key").eq("user_id", user.id);
  if (error) throw error;
  return (data ?? []).map((row) => row.report_key);
}

export async function saveReport(reportKey: string): Promise<void> {
  const db = createServerDbClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await db.from("admin_saved_reports").upsert(
    { user_id: user.id, report_key: reportKey },
    { onConflict: "user_id,report_key" },
  );
  if (error) throw error;
}

export async function unsaveReport(reportKey: string): Promise<void> {
  const db = createServerDbClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await db.from("admin_saved_reports").delete().eq("user_id", user.id).eq("report_key", reportKey);
  if (error) throw error;
}
