"use server";

import { revalidatePath } from "next/cache";
import { requireCapability } from "@/lib/auth";
import { clearOutbox } from "@/lib/data/email-outbox";

/** Admin-only: the outbox holds copies of mail addressed to visitors and subscribers. */
export async function clearEmailOutboxAction(): Promise<void> {
  await requireCapability("manage_users");
  await clearOutbox();
  revalidatePath("/admin/email-outbox");
}
