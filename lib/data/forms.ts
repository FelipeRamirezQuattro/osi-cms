import { createServerDbClient } from "@/lib/db/client";
import type { TablesInsert } from "@/lib/db/database.types";

export async function insertFormSubmission(
  submission: Omit<TablesInsert<"form_submissions">, "status">,
): Promise<{ error: string | null }> {
  const db = createServerDbClient();
  const { error } = await db.from("form_submissions").insert(submission);
  return { error: error?.message ?? null };
}
