import { recordAudit } from "@/lib/data/audit";
import { createServerDbClient, createServiceRoleDbClient } from "@/lib/db/client";
import type { Tables } from "@/lib/db/database.types";

export type NewsletterSubscriber = Tables<"newsletter_subscribers">;
export type NewsletterTag = Tables<"newsletter_tags">;
export type NewsletterSubscriberWithTags = NewsletterSubscriber & { tag_ids: string[] };

// --- Public signup / confirm / unsubscribe ------------------------------------
//
// Service-role client throughout: these tables are staff-only under RLS, and
// an anonymous visitor has no session. Every function here is called only
// from a Server Action or Server Component that has already validated its
// input (and, for confirm/unsubscribe, verified a signed token).

export async function findSubscriberByEmail(email: string): Promise<NewsletterSubscriber | null> {
  const db = createServiceRoleDbClient();
  const { data, error } = await db.from("newsletter_subscribers").select("*").eq("email", email).maybeSingle();
  if (error) throw error;
  return data;
}

/** Recent rows written from this IP — a per-IP brake on signups for many different addresses. */
export async function countRecentSignupsByIp(ipHash: string, windowMinutes: number): Promise<number> {
  const db = createServiceRoleDbClient();
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count, error } = await db
    .from("newsletter_subscribers")
    .select("*", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("updated_at", since);
  if (error) throw error;
  return count ?? 0;
}

export async function createPendingSubscriber(params: {
  email: string;
  ipHash: string;
  pageSlug: string | null;
}): Promise<NewsletterSubscriber> {
  const db = createServiceRoleDbClient();
  const { data, error } = await db
    .from("newsletter_subscribers")
    .insert({ email: params.email, status: "pending", ip_hash: params.ipHash, page_slug: params.pageSlug })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/** Puts an existing pending/unsubscribed row back into double opt-in with a fresh consent timestamp. */
export async function restartPendingSubscriber(
  id: string,
  params: { ipHash: string; pageSlug: string | null },
): Promise<NewsletterSubscriber> {
  const db = createServiceRoleDbClient();
  const { data, error } = await db
    .from("newsletter_subscribers")
    .update({
      status: "pending",
      ip_hash: params.ipHash,
      page_slug: params.pageSlug,
      consented_at: new Date().toISOString(),
      confirmed_at: null,
      unsubscribed_at: null,
    })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function markConfirmationSent(id: string): Promise<void> {
  const db = createServiceRoleDbClient();
  const { error } = await db
    .from("newsletter_subscribers")
    .update({ confirmation_sent_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export type ConfirmResult = "confirmed" | "already_subscribed" | "not_pending";

/**
 * pending -> subscribed. A confirm link clicked after the person has since
 * unsubscribed must NOT quietly re-subscribe them, so that case reports
 * `not_pending` and changes nothing.
 */
export async function confirmSubscriber(id: string): Promise<ConfirmResult> {
  const db = createServiceRoleDbClient();
  const { data: current, error: readError } = await db
    .from("newsletter_subscribers")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (readError) throw readError;
  if (!current) return "not_pending";
  if (current.status === "subscribed") return "already_subscribed";
  if (current.status !== "pending") return "not_pending";

  const { error } = await db
    .from("newsletter_subscribers")
    .update({ status: "subscribed", confirmed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending");
  if (error) throw error;
  return "confirmed";
}

/** Any status -> unsubscribed. Returns false only when the subscriber no longer exists. */
export async function unsubscribeSubscriber(id: string): Promise<boolean> {
  const db = createServiceRoleDbClient();
  const { data, error } = await db
    .from("newsletter_subscribers")
    .update({ status: "unsubscribed", unsubscribed_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

// --- Admin (staff session; RLS applies) ---------------------------------------

export async function listSubscribers(): Promise<NewsletterSubscriberWithTags[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("newsletter_subscribers")
    .select("*, newsletter_subscriber_tags(tag_id)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(({ newsletter_subscriber_tags, ...subscriber }) => ({
    ...subscriber,
    tag_ids: newsletter_subscriber_tags.map((row) => row.tag_id),
  }));
}

export async function deleteSubscriber(id: string): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.from("newsletter_subscribers").delete().eq("id", id);
  if (error) throw error;
  // Id only — never the email, so an erasure isn't undone by the audit log.
  await recordAudit("delete", "newsletter_subscriber", id);
}

export async function listTags(): Promise<NewsletterTag[]> {
  const db = createServerDbClient();
  const { data, error } = await db.from("newsletter_tags").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

/** Returns null when a tag with that name (case-insensitive) already exists. */
export async function createTag(name: string): Promise<NewsletterTag | null> {
  const db = createServerDbClient();
  const { data, error } = await db.from("newsletter_tags").insert({ name }).select("*").single();
  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }
  return data;
}

export async function deleteTag(id: string): Promise<void> {
  const db = createServerDbClient();
  const { error } = await db.from("newsletter_tags").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Sets a subscriber's tags to exactly `tagIds`. Adds first, then removes, so
 * a failure part-way through can only leave a subscriber with an extra tag,
 * never with their tags wiped.
 */
export async function setSubscriberTags(subscriberId: string, tagIds: string[]): Promise<void> {
  const db = createServerDbClient();
  const { data: current, error: readError } = await db
    .from("newsletter_subscriber_tags")
    .select("tag_id")
    .eq("subscriber_id", subscriberId);
  if (readError) throw readError;

  const have = new Set((current ?? []).map((row) => row.tag_id));
  const want = new Set(tagIds);
  const toAdd = [...want].filter((id) => !have.has(id));
  const toRemove = [...have].filter((id) => !want.has(id));

  if (toAdd.length > 0) {
    const { error } = await db
      .from("newsletter_subscriber_tags")
      .insert(toAdd.map((tag_id) => ({ subscriber_id: subscriberId, tag_id })));
    if (error) throw error;
  }
  if (toRemove.length > 0) {
    const { error } = await db
      .from("newsletter_subscriber_tags")
      .delete()
      .eq("subscriber_id", subscriberId)
      .in("tag_id", toRemove);
    if (error) throw error;
  }
}
