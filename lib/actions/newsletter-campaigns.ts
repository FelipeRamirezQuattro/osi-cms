"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth";
import { hasCapability } from "@/lib/auth/capabilities";
import {
  createCampaign,
  deleteDraftCampaign,
  getCampaign,
  listCampaigns,
  countAudience,
  updateCampaignDraft,
  type NewsletterCampaign,
  type NewsletterCampaignSummary,
} from "@/lib/data/newsletter-campaigns";
import type { Json } from "@/lib/db/database.types";
import { sendCampaignTest } from "@/lib/email";
import { validateEmailBlocks } from "@/lib/email-blocks/registry";
import { renderNewsletterEmail, UNSUBSCRIBE_PLACEHOLDER } from "@/lib/email-blocks/render";
import { getMailingAddress, getNewsletterReadiness, type NewsletterReadiness } from "@/lib/newsletter/readiness";
import { checkCampaignSendable, sendCampaignStep, type CampaignStepResult } from "@/lib/newsletter/send-campaign";
import { absoluteUrl } from "@/lib/seo";
import { campaignInputSchema } from "@/lib/validation/newsletter";
import { z } from "zod";

export type CampaignActionResult = { status: "success" } | { status: "error"; message: string };

const LIST_PAGE = "/admin/newsletter/campaigns";
const LOCKED = "This campaign has already been sent (or is sending) and can no longer be edited.";

/** Zod + per-block validation shared by save, preview and test send. */
function parseInput(input: unknown):
  | { ok: true; value: z.infer<typeof campaignInputSchema>; blocks: { type: string; data: unknown }[] }
  | { ok: false; message: string } {
  const parsed = campaignInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid campaign." };
  const blocks = validateEmailBlocks(parsed.data.blocks);
  if (!blocks.ok) return { ok: false, message: blocks.message };
  return { ok: true, value: parsed.data, blocks: blocks.blocks };
}

export async function listCampaignsAction(): Promise<NewsletterCampaignSummary[]> {
  await requireCapability("manage_newsletter");
  return listCampaigns();
}

export async function createCampaignAction(name: string): Promise<{ status: "success"; id: string } | { status: "error"; message: string }> {
  await requireCapability("manage_newsletter");
  const parsed = campaignInputSchema.shape.name.safeParse(name);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid name." };
  const campaign = await createCampaign(parsed.data);
  revalidatePath(LIST_PAGE);
  return { status: "success", id: campaign.id };
}

export async function saveCampaignAction(id: string, input: unknown): Promise<CampaignActionResult> {
  await requireCapability("manage_newsletter");
  const parsed = parseInput(input);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const { name, subject, preheader, tag_ids } = parsed.value;
  // Saved as the parsed blocks (schema defaults filled in), not the raw input.
  const saved = await updateCampaignDraft(id, { name, subject, preheader, tag_ids, blocks: parsed.blocks as unknown as Json });
  if (!saved) return { status: "error", message: LOCKED };
  revalidatePath(LIST_PAGE);
  return { status: "success" };
}

/** Renders the email exactly as it would be sent (from unsaved editor state) for the preview pane. */
export async function previewCampaignAction(input: unknown): Promise<{ status: "success"; html: string } | { status: "error"; message: string }> {
  await requireCapability("manage_newsletter");
  const parsed = parseInput(input);
  if (!parsed.ok) return { status: "error", message: parsed.message };
  const { html } = await renderNewsletterEmail({
    subject: parsed.value.subject,
    preheader: parsed.value.preheader,
    blocks: parsed.blocks,
    mailingAddress: getMailingAddress(),
  });
  // The preview has no recipient, so the unsubscribe link goes to the (invalid-token) page.
  return { status: "success", html: html.replaceAll(UNSUBSCRIBE_PLACEHOLDER, absoluteUrl("/newsletter/unsubscribe")) };
}

/** Sends the current editor state to one address (default: the signed-in staff member). Not a real send: no recipients, no unsubscribe token. */
export async function sendTestEmailAction(input: unknown, to?: string): Promise<CampaignActionResult> {
  const session = await requireCapability("manage_newsletter");
  const readiness = getNewsletterReadiness();
  if (!readiness.canSendTest) {
    return { status: "error", message: `Email isn't set up yet — missing: ${readiness.missing.filter((n) => n.startsWith("RESEND")).join(", ")}.` };
  }

  const address = z.string().trim().email("Enter a valid email address").safeParse(to?.trim() || session.email);
  if (!address.success) return { status: "error", message: address.error.issues[0]?.message ?? "Invalid email address." };
  const parsed = parseInput(input);
  if (!parsed.ok) return { status: "error", message: parsed.message };

  const { html, text } = await renderNewsletterEmail({
    subject: parsed.value.subject,
    preheader: parsed.value.preheader,
    blocks: parsed.blocks,
    mailingAddress: getMailingAddress(),
  });
  const unsubscribe = absoluteUrl("/newsletter/unsubscribe");
  const result = await sendCampaignTest({
    to: address.data,
    subject: `[Test] ${parsed.value.subject || "(no subject)"}`,
    html: html.replaceAll(UNSUBSCRIBE_PLACEHOLDER, unsubscribe),
    text: text.replaceAll(UNSUBSCRIBE_PLACEHOLDER, unsubscribe),
  });
  return result.ok ? { status: "success" } : { status: "error", message: result.message };
}

export type CampaignSendSummary = {
  /** Why it can't be sent yet, or null. */
  problem: string | null;
  audienceCount: number;
  readiness: NewsletterReadiness;
  /** Sending to the whole list is publish-level: admins only. */
  canSend: boolean;
};

/** What the "Send" confirmation needs to show — computed from the SAVED draft, so the editor saves first. */
export async function getCampaignSendSummaryAction(id: string): Promise<CampaignSendSummary | null> {
  const session = await requireCapability("manage_newsletter");
  const campaign = await getCampaign(id);
  if (!campaign) return null;
  return {
    problem: campaign.status === "draft" ? await checkCampaignSendable(campaign) : null,
    audienceCount: await countAudience(campaign.tag_ids),
    readiness: getNewsletterReadiness(),
    canSend: hasCapability(session.role, "publish"),
  };
}

/**
 * Starts (draft) or continues (sending) a real send. The UI calls this in a
 * loop until `progress.done`. Admin-only: mailing the whole list is as
 * consequential as publishing a page, which is also admin-only.
 */
export async function sendCampaignStepAction(id: string): Promise<CampaignStepResult> {
  await requireCapability("publish");
  try {
    const result = await sendCampaignStep(id);
    revalidatePath(LIST_PAGE);
    return result;
  } catch (err) {
    console.error("[newsletter] Campaign send step failed:", err);
    return { ok: false, message: "Something went wrong while sending. It is safe to try again — it will resume where it stopped." };
  }
}

export async function deleteCampaignAction(id: string): Promise<CampaignActionResult> {
  await requireCapability("delete_content");
  const deleted = await deleteDraftCampaign(id);
  if (!deleted) return { status: "error", message: "Only drafts can be deleted — a sent campaign stays as a record." };
  revalidatePath(LIST_PAGE);
  return { status: "success" };
}

export async function getCampaignAction(id: string): Promise<NewsletterCampaign | null> {
  await requireCapability("manage_newsletter");
  return getCampaign(id);
}
