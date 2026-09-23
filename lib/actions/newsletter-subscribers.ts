"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth";
import { buildSubscribersCsv } from "@/lib/admin/subscribers-csv";
import {
  addOrResubscribeByStaff,
  createTag,
  deleteSubscriber,
  deleteTag,
  listSubscribers,
  listTags,
  setSubscriberTags,
  type NewsletterSubscriberWithTags,
  type NewsletterTag,
} from "@/lib/data/newsletter-subscribers";
import { adminAddSubscriberEmailSchema, newsletterTagNameSchema } from "@/lib/validation/newsletter";

export type SubscribersAdminData = { subscribers: NewsletterSubscriberWithTags[]; tags: NewsletterTag[] };
export type NewsletterAdminResult = { status: "success" } | { status: "error"; message: string };

const PAGE = "/admin/newsletter/subscribers";

export async function listSubscribersAction(): Promise<SubscribersAdminData> {
  await requireCapability("manage_newsletter");
  const [subscribers, tags] = await Promise.all([listSubscribers(), listTags()]);
  return { subscribers, tags };
}

export async function createTagAction(name: string): Promise<NewsletterAdminResult> {
  await requireCapability("manage_newsletter");
  const parsed = newsletterTagNameSchema.safeParse(name);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid tag name." };
  const tag = await createTag(parsed.data);
  if (!tag) return { status: "error", message: "A tag with that name already exists." };
  revalidatePath(PAGE);
  return { status: "success" };
}

export async function deleteTagAction(id: string): Promise<NewsletterAdminResult> {
  await requireCapability("manage_newsletter");
  await deleteTag(id);
  revalidatePath(PAGE);
  return { status: "success" };
}

export type AddSubscriberResult = { status: "success"; alreadySubscribed: boolean } | { status: "error"; message: string };

/**
 * The manual-add path (off-site consent: phone, in person) — skips double
 * opt-in entirely, unlike the public signup form. Same `manage_newsletter`
 * gate as tag management: adding someone staff already have consent from
 * is day-to-day marketing work, not a destructive action.
 */
export async function addSubscriberAction(email: string, tagIds: string[]): Promise<AddSubscriberResult> {
  await requireCapability("manage_newsletter");
  const parsed = adminAddSubscriberEmailSchema.safeParse(email);
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid email address." };

  const { subscriber, previousStatus } = await addOrResubscribeByStaff(parsed.data);
  if (tagIds.length > 0) await setSubscriberTags(subscriber.id, tagIds);
  revalidatePath(PAGE);
  return { status: "success", alreadySubscribed: previousStatus === "subscribed" };
}

export async function setSubscriberTagsAction(subscriberId: string, tagIds: string[]): Promise<NewsletterAdminResult> {
  await requireCapability("manage_newsletter");
  await setSubscriberTags(subscriberId, tagIds);
  revalidatePath(PAGE);
  return { status: "success" };
}

/**
 * Removes a subscriber's row entirely (an erasure request). Admin-only like
 * every other permanent delete (`delete_content`). Note this also erases the
 * unsubscribed record for that address, so it is for erasure requests — a
 * person who just wants no more email should use their unsubscribe link.
 */
export async function deleteSubscriberAction(id: string): Promise<NewsletterAdminResult> {
  await requireCapability("delete_content");
  await deleteSubscriber(id);
  revalidatePath(PAGE);
  return { status: "success" };
}

/** CSV text; the client turns it into a download (same approach as the submissions export). */
export async function exportSubscribersCsvAction(): Promise<string> {
  await requireCapability("manage_newsletter");
  const [subscribers, tags] = await Promise.all([listSubscribers(), listTags()]);
  return buildSubscribersCsv(subscribers, tags);
}
