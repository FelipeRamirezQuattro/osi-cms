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

// --- Task 10: generic form definitions ---

/**
 * Public read path for the generic `form` block
 * (components/blocks/form.tsx) — filtered to published, mirroring every
 * other public content read (form_definitions' RLS SELECT policy already
 * enforces `status = 'published' OR is_staff()`; this query narrows to
 * published explicitly so a staff session previewing the public site
 * doesn't accidentally render a draft-in-progress form).
 */
export async function getPublishedFormDefinitionByKey(formKey: string): Promise<Tables<"form_definitions"> | null> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("form_definitions")
    .select("*")
    .eq("form_key", formKey)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data;
}

// --- Admin ---

export async function listFormDefinitions(): Promise<Tables<"form_definitions">[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("form_definitions")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getFormDefinitionById(id: string): Promise<Tables<"form_definitions"> | null> {
  const db = createServerDbClient();
  const { data, error } = await db.from("form_definitions").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export type FormDefinitionInputRow = Omit<TablesInsert<"form_definitions">, "id" | "created_at" | "updated_at" | "updated_by">;

export async function createFormDefinition(input: FormDefinitionInputRow): Promise<Tables<"form_definitions">> {
  const db = createServerDbClient();
  const { data, error } = await db.from("form_definitions").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateFormDefinition(
  id: string,
  input: FormDefinitionInputRow,
): Promise<Tables<"form_definitions">> {
  const db = createServerDbClient();
  const { data, error } = await db.from("form_definitions").update(input).eq("id", id).select("*").single();
  if (error) throw error;
  return data;
}

export async function deleteFormDefinition(id: string): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.from("form_definitions").delete().eq("id", id);
  if (error) throw error;
}
