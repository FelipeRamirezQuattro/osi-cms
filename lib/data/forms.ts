import { createServerDbClient } from "@/lib/db/client";
import type { Tables, TablesInsert } from "@/lib/db/database.types";

export async function insertFormSubmission(
  submission: Omit<TablesInsert<"form_submissions">, "status">,
): Promise<{ error: string | null }> {
  const db = createServerDbClient();
  const { error } = await db.from("form_submissions").insert(submission);
  return { error: error?.message ?? null };
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
