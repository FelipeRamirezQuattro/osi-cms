import { createServerDbClient } from "@/lib/db/client";
import type { Json, Tables } from "@/lib/db/database.types";

export type NewsletterCampaign = Tables<"newsletter_campaigns">;
export type NewsletterCampaignSummary = Pick<
  NewsletterCampaign,
  "id" | "name" | "subject" | "status" | "total_recipients" | "sent_at" | "created_at" | "updated_at"
>;
export type CampaignStats = { pending: number; sent: number; failed: number; skipped: number };

// Everything here runs as the signed-in staff member (RLS applies): campaigns
// are created, edited and sent from the admin, never by anonymous visitors.

const PAGE = 1000; // PostgREST returns at most this many rows per request.

export async function listCampaigns(): Promise<NewsletterCampaignSummary[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("newsletter_campaigns")
    .select("id, name, subject, status, total_recipients, sent_at, created_at, updated_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getCampaign(id: string): Promise<NewsletterCampaign | null> {
  const db = createServerDbClient();
  const { data, error } = await db.from("newsletter_campaigns").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function createCampaign(name: string): Promise<NewsletterCampaign> {
  const db = createServerDbClient();
  const { data, error } = await db.from("newsletter_campaigns").insert({ name }).select("*").single();
  if (error) throw error;
  return data;
}

export type CampaignDraftInput = {
  name: string;
  subject: string;
  preheader: string;
  blocks: Json;
  tag_ids: string[];
};

/** Returns null when the campaign isn't a draft any more (already sending/sent) — sent mail can't be edited. */
export async function updateCampaignDraft(id: string, input: CampaignDraftInput): Promise<NewsletterCampaign | null> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("newsletter_campaigns")
    .update(input)
    .eq("id", id)
    .eq("status", "draft")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Drafts only — a campaign that has gone out stays as a record of what was sent. Returns whether a row was deleted. */
export async function deleteDraftCampaign(id: string): Promise<boolean> {
  const db = createServerDbClient();
  const { data, error } = await db.from("newsletter_campaigns").delete().eq("id", id).eq("status", "draft").select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

/**
 * draft -> sending, atomically: the `status = 'draft'` condition means that
 * of two simultaneous clicks on Send only one gets the row back.
 */
export async function claimCampaignForSending(id: string): Promise<NewsletterCampaign | null> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("newsletter_campaigns")
    .update({ status: "sending", started_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "draft")
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data;
}

// --- Audience ------------------------------------------------------------------

/** Ids of everyone who is `subscribed` and (when tags are given) carries any of them. */
export async function listAudienceSubscriberIds(tagIds: string[]): Promise<string[]> {
  const db = createServerDbClient();
  const ids: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const base = db.from("newsletter_subscribers");
    // The inner join + filter keeps only subscribers with a matching tag while
    // returning each subscriber once, however many of the tags they carry.
    const query =
      tagIds.length > 0
        ? base.select("id, newsletter_subscriber_tags!inner(tag_id)").in("newsletter_subscriber_tags.tag_id", tagIds)
        : base.select("id");
    const { data, error } = await query.eq("status", "subscribed").order("id").range(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data ?? [];
    ids.push(...rows.map((row) => row.id));
    if (rows.length < PAGE) return ids;
  }
}

export async function countAudience(tagIds: string[]): Promise<number> {
  return (await listAudienceSubscriberIds(tagIds)).length;
}

/**
 * Snapshots the audience into recipient rows and records the total. Safe to
 * re-run after an interruption: rows that already exist are left alone, so
 * it only fills in what is missing.
 */
export async function prepareRecipients(campaignId: string, tagIds: string[]): Promise<number> {
  const db = createServerDbClient();
  const subscriberIds = await listAudienceSubscriberIds(tagIds);

  const CHUNK = 500;
  for (let i = 0; i < subscriberIds.length; i += CHUNK) {
    const { error } = await db
      .from("newsletter_campaign_recipients")
      .upsert(
        subscriberIds.slice(i, i + CHUNK).map((subscriber_id) => ({ campaign_id: campaignId, subscriber_id })),
        { onConflict: "campaign_id,subscriber_id", ignoreDuplicates: true },
      );
    if (error) throw error;
  }

  const { count, error: countError } = await db
    .from("newsletter_campaign_recipients")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId);
  if (countError) throw countError;
  const total = count ?? 0;

  const { error } = await db.from("newsletter_campaigns").update({ total_recipients: total }).eq("id", campaignId);
  if (error) throw error;
  return total;
}

// --- Sending -------------------------------------------------------------------

export type PendingRecipient = {
  recipientId: string;
  subscriberId: string;
  email: string;
  /** Re-read at send time so someone who unsubscribed mid-campaign is skipped. */
  subscriberStatus: string;
};

export async function listPendingRecipients(campaignId: string, limit: number): Promise<PendingRecipient[]> {
  const db = createServerDbClient();
  const { data, error } = await db
    .from("newsletter_campaign_recipients")
    .select("id, subscriber_id, newsletter_subscribers(email, status)")
    .eq("campaign_id", campaignId)
    .eq("status", "pending")
    .order("id")
    .limit(limit);
  if (error) throw error;
  return (data ?? []).flatMap((row) =>
    row.newsletter_subscribers
      ? [
          {
            recipientId: row.id,
            subscriberId: row.subscriber_id,
            email: row.newsletter_subscribers.email,
            subscriberStatus: row.newsletter_subscribers.status,
          },
        ]
      : [],
  );
}

export type RecipientOutcome =
  | { recipientId: string; subscriberId: string; status: "sent"; providerMessageId: string }
  | { recipientId: string; subscriberId: string; status: "failed"; error: string }
  | { recipientId: string; subscriberId: string; status: "skipped" };

/** One bulk upsert per batch instead of a request per recipient (subscriber_id/campaign_id are NOT NULL, so the upsert must carry them). */
export async function recordRecipientOutcomes(campaignId: string, outcomes: RecipientOutcome[]): Promise<void> {
  if (outcomes.length === 0) return;
  const db = createServerDbClient();
  const now = new Date().toISOString();
  const { error } = await db.from("newsletter_campaign_recipients").upsert(
    outcomes.map((outcome) => ({
      id: outcome.recipientId,
      campaign_id: campaignId,
      subscriber_id: outcome.subscriberId,
      status: outcome.status,
      provider_message_id: outcome.status === "sent" ? outcome.providerMessageId : null,
      error: outcome.status === "failed" ? outcome.error.slice(0, 500) : null,
      sent_at: outcome.status === "sent" ? now : null,
    })),
    { onConflict: "id" },
  );
  if (error) throw error;
}

export async function getCampaignStats(campaignId: string): Promise<CampaignStats> {
  const db = createServerDbClient();
  const count = async (status: keyof CampaignStats) => {
    const { count: n, error } = await db
      .from("newsletter_campaign_recipients")
      .select("*", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("status", status);
    if (error) throw error;
    return n ?? 0;
  };
  const [pending, sent, failed, skipped] = await Promise.all([count("pending"), count("sent"), count("failed"), count("skipped")]);
  return { pending, sent, failed, skipped };
}

/** sending -> sent, or `failed` when nothing at all could be delivered. */
export async function finalizeCampaign(campaignId: string, stats: CampaignStats): Promise<"sent" | "failed"> {
  const db = createServerDbClient();
  const status = stats.sent === 0 && stats.failed > 0 ? "failed" : "sent";
  const { error } = await db
    .from("newsletter_campaigns")
    .update({ status, sent_at: new Date().toISOString() })
    .eq("id", campaignId)
    .eq("status", "sending");
  if (error) throw error;
  return status;
}
