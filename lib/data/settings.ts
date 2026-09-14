import { createServerDbClient } from "@/lib/db/client";
import { recordAudit } from "@/lib/data/audit";
import type { Tables, TablesUpdate } from "@/lib/db/database.types";

export async function getSiteSettings(): Promise<Tables<"site_settings">> {
  const db = createServerDbClient();
  const { data, error } = await db.from("site_settings").select("*").single();
  if (error) throw error;
  return data;
}

// --- Admin ---
// Singleton row (id is a check(id) boolean PK — see migration 0007), so
// there's always exactly one row to update, never an insert/delete.

export async function updateSiteSettings(values: TablesUpdate<"site_settings">): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.from("site_settings").update(values).eq("id", true);
  if (error) throw error;
  // site_settings is a singleton (boolean PK, see the comment above) with
  // no meaningful uuid to log as entity_id — field names only, never
  // values (phone/email/social links aren't secrets, but there's no
  // reason to duplicate them into audit_log either).
  await recordAudit("update", "site_settings", null, { changedFields: Object.keys(values) });
}
