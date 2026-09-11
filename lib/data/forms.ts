import { createServerDbClient, createServiceRoleDbClient } from "@/lib/db/client";
import type { Tables, TablesInsert } from "@/lib/db/database.types";

export async function insertFormSubmission(
  submission: Omit<TablesInsert<"form_submissions">, "status">,
): Promise<{ error: string | null }> {
  const db = createServerDbClient();
  const { error } = await db.from("form_submissions").insert(submission);
  return { error: error?.message ?? null };
}

/**
 * Server-side rate limit for public form submission — no Redis/Upstash in
 * the stack, so this leans on the table itself (already keyed by
 * ip_hash). Uses the service-role client deliberately: RLS only grants
 * `form_submissions` SELECT to staff, and an anonymous visitor submitting
 * the form has no session at all — the anon-key client would silently
 * read back zero rows every time (RLS-filtered, not an error) and the
 * limit would never trigger.
 */
export async function countRecentSubmissionsByIp(ipHash: string, windowMinutes: number): Promise<number> {
  const db = createServiceRoleDbClient();
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count, error } = await db
    .from("form_submissions")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", since);
  if (error) throw error;
  return count ?? 0;
}

// --- Admin ---

export async function countNewSubmissions(): Promise<number> {
  const db = createServerDbClient();
  const { count, error } = await db
    .from("form_submissions")
    .select("*", { count: "exact", head: true })
    .eq("status", "new");
  if (error) throw error;
  return count ?? 0;
}

export async function listSubmissions(): Promise<Tables<"form_submissions">[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("form_submissions")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateSubmissionStatus(
  id: string,
  status: Tables<"form_submissions">["status"],
): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.from("form_submissions").update({ status }).eq("id", id);
  if (error) throw error;
}
