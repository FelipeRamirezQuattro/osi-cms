import { createHash } from "node:crypto";
import {
  claimCampaignForSending,
  countAudience,
  finalizeCampaign,
  getCampaign,
  getCampaignStats,
  listPendingRecipients,
  prepareRecipients,
  recordRecipientOutcomes,
  type CampaignStats,
  type NewsletterCampaign,
  type PendingRecipient,
  type RecipientOutcome,
} from "@/lib/data/newsletter-campaigns";
import { CAMPAIGN_BATCH_SIZE, sendCampaignBatch, type CampaignEmail } from "@/lib/email";
import { UNSUBSCRIBE_PLACEHOLDER, renderNewsletterEmail } from "@/lib/email-blocks/render";
import { validateEmailBlocks } from "@/lib/email-blocks/registry";
import { getMailingAddress, getNewsletterReadiness } from "@/lib/newsletter/readiness";
import { createSubscriberToken } from "@/lib/newsletter/tokens";
import { absoluteUrl } from "@/lib/seo";

export type CampaignProgress = CampaignStats & {
  status: "sending" | "sent" | "failed";
  total: number;
  done: boolean;
  /** Set when the provider asked us to slow down or was unreachable — call again shortly. */
  retryMessage?: string;
};

export type CampaignStepResult = { ok: true; progress: CampaignProgress } | { ok: false; message: string };

const fail = (message: string): CampaignStepResult => ({ ok: false, message });

/** Why a draft can't be sent yet, or null when it can. Shared by the editor's pre-send check and the send itself. */
export async function checkCampaignSendable(campaign: NewsletterCampaign): Promise<string | null> {
  if (!campaign.subject.trim()) return "Add a subject line before sending.";
  const blocks = validateEmailBlocks(campaign.blocks);
  if (!blocks.ok) return blocks.message;
  if (blocks.blocks.length === 0) return "Add some content before sending.";
  if ((await countAudience(campaign.tag_ids)) === 0) {
    return campaign.tag_ids.length > 0
      ? "Nobody subscribed has the selected tags, so there's no one to send to."
      : "There are no confirmed subscribers to send to yet.";
  }
  return null;
}

function personalize(recipient: PendingRecipient, html: string, text: string): Omit<CampaignEmail, "subject"> {
  const token = createSubscriberToken("unsubscribe", recipient.subscriberId);
  // Readiness guarantees the secret exists; a null here would be a bug, and
  // sending a link that can't be verified is worse than not sending.
  if (!token) throw new Error("NEWSLETTER_TOKEN_SECRET is not set.");
  const query = `?token=${encodeURIComponent(token)}`;
  const pageUrl = absoluteUrl(`/newsletter/unsubscribe${query}`);
  return {
    to: recipient.email,
    html: html.replaceAll(UNSUBSCRIBE_PLACEHOLDER, pageUrl),
    text: text.replaceAll(UNSUBSCRIBE_PLACEHOLDER, pageUrl),
    oneClickUnsubscribeUrl: absoluteUrl(`/api/newsletter/unsubscribe${query}`),
  };
}

/**
 * Identical for a retry of the exact same batch (same campaign, same
 * recipients), so a crash between "the provider accepted it" and "we
 * recorded it" can't cause a double send — the provider dedupes on this key.
 */
function idempotencyKey(campaignId: string, recipients: PendingRecipient[]): string {
  const digest = createHash("sha256").update(recipients.map((r) => r.recipientId).join(",")).digest("hex").slice(0, 32);
  return `campaign-${campaignId}-${digest}`;
}

/**
 * Advances a campaign as far as `budgetMs` allows and reports progress. Meant
 * to be called repeatedly (the admin UI loops on it) until `done`, because a
 * single serverless request can't be trusted to outlive a large list. It
 * both starts a draft (validate -> claim -> snapshot recipients) and resumes a
 * `sending` one, so an interrupted send is finished by simply calling again.
 */
export async function sendCampaignStep(campaignId: string, options: { budgetMs?: number; now?: () => number } = {}): Promise<CampaignStepResult> {
  const { budgetMs = 8000, now = Date.now } = options;

  const readiness = getNewsletterReadiness();
  if (!readiness.canSendCampaign) {
    return fail(`Email isn't fully set up yet — missing: ${readiness.missing.join(", ")}.`);
  }

  let campaign = await getCampaign(campaignId);
  if (!campaign) return fail("Campaign not found.");

  if (campaign.status === "draft") {
    const problem = await checkCampaignSendable(campaign);
    if (problem) return fail(problem);
    // If another click claimed it first, carry on as a resume of that send.
    campaign = (await claimCampaignForSending(campaignId)) ?? (await getCampaign(campaignId)) ?? campaign;
  }

  const finished = campaign.status === "sent" || campaign.status === "failed";
  if (!finished && campaign.total_recipients === null) {
    campaign = { ...campaign, total_recipients: await prepareRecipients(campaignId, campaign.tag_ids) };
  }

  let retryMessage: string | undefined;

  if (!finished) {
    const blocks = validateEmailBlocks(campaign.blocks);
    if (!blocks.ok) return fail(blocks.message);
    const { html, text } = await renderNewsletterEmail({
      subject: campaign.subject,
      preheader: campaign.preheader,
      blocks: blocks.blocks,
      mailingAddress: getMailingAddress(),
    });

    const started = now();
    for (;;) {
      const pending = await listPendingRecipients(campaignId, CAMPAIGN_BATCH_SIZE);
      if (pending.length === 0) break;

      const outcomes: RecipientOutcome[] = [];
      const sendable: PendingRecipient[] = [];
      for (const recipient of pending) {
        // Re-checked now, not when the audience was snapshotted: someone who
        // unsubscribed while this campaign was going out must not get it.
        if (recipient.subscriberStatus === "subscribed") sendable.push(recipient);
        else outcomes.push({ recipientId: recipient.recipientId, subscriberId: recipient.subscriberId, status: "skipped" });
      }

      if (sendable.length > 0) {
        const messages = sendable.map((recipient) => ({ ...personalize(recipient, html, text), subject: campaign.subject }));
        const result = await sendCampaignBatch(messages, idempotencyKey(campaignId, sendable));
        if (result.ok) {
          sendable.forEach((recipient, i) =>
            outcomes.push({ recipientId: recipient.recipientId, subscriberId: recipient.subscriberId, status: "sent", providerMessageId: result.ids[i]! }),
          );
        } else if (result.retryable) {
          // Leave the batch pending so the next call retries it; still record
          // any skips found above.
          retryMessage = result.message;
        } else {
          sendable.forEach((recipient) =>
            outcomes.push({ recipientId: recipient.recipientId, subscriberId: recipient.subscriberId, status: "failed", error: result.message }),
          );
        }
      }

      await recordRecipientOutcomes(campaignId, outcomes);
      if (retryMessage || now() - started >= budgetMs) break;
    }
  }

  const stats = await getCampaignStats(campaignId);
  let status: CampaignProgress["status"] = finished ? (campaign.status as "sent" | "failed") : "sending";
  if (!finished && !retryMessage && stats.pending === 0) status = await finalizeCampaign(campaignId, stats);

  return {
    ok: true,
    progress: {
      ...stats,
      status,
      total: campaign.total_recipients ?? stats.pending + stats.sent + stats.failed + stats.skipped,
      done: status !== "sending",
      retryMessage,
    },
  };
}
