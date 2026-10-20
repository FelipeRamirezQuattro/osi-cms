import { createServerDbClient, createServiceRoleDbClient } from "@/lib/db/client";

/**
 * Dry-run outbox (migration 0056_email_outbox.sql). The table isn't in the
 * generated `database.types.ts` until that migration is applied and the types
 * regenerated, so this repository talks to it through a deliberately loose
 * client — the same trade-off lib/data/admin-entities.ts documents for its
 * runtime table names. Remove the casts after regenerating the types.
 */

export type OutboxMessage = {
  kind: string;
  to: string;
  from: string;
  replyTo?: string | null;
  subject: string;
  html?: string | null;
  text: string;
  headers?: Record<string, string>;
};

export type OutboxRow = {
  id: string;
  kind: string;
  to_address: string;
  from_address: string;
  reply_to: string | null;
  subject: string;
  html_body: string | null;
  text_body: string;
  headers: Record<string, string>;
  created_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see file comment
type LooseDb = { from: (table: string) => any };

/** Best-effort: a missing table (migration not applied yet) must never break the flow being dry-run. */
export async function recordOutboxMessage(message: OutboxMessage): Promise<boolean> {
  try {
    const db = createServiceRoleDbClient() as unknown as LooseDb;
    const { error } = await db.from("email_outbox").insert({
      kind: message.kind,
      to_address: message.to,
      from_address: message.from,
      reply_to: message.replyTo ?? null,
      subject: message.subject,
      html_body: message.html ?? null,
      text_body: message.text,
      headers: message.headers ?? {},
    });
    if (error) {
      console.error("[email] Could not store dry-run message in email_outbox:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] Could not store dry-run message in email_outbox:", err);
    return false;
  }
}

export async function listOutboxMessages(limit = 100): Promise<OutboxRow[]> {
  const db = createServerDbClient() as unknown as LooseDb;
  const { data, error } = await db.from("email_outbox").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return (data ?? []) as OutboxRow[];
}

export async function clearOutbox(): Promise<void> {
  const db = createServerDbClient() as unknown as LooseDb;
  const { error } = await db.from("email_outbox").delete().not("id", "is", null);
  if (error) throw error;
}
