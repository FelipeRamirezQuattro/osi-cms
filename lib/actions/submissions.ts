"use server";

import { requireAdmin } from "@/lib/auth";
import { listSubmissions, updateSubmissionStatus } from "@/lib/data/forms";
import type { Tables } from "@/lib/db/database.types";

export async function listSubmissionsAction(): Promise<Tables<"form_submissions">[]> {
  await requireAdmin();
  return listSubmissions();
}

export async function updateSubmissionStatusAction(
  id: string,
  status: Tables<"form_submissions">["status"],
): Promise<void> {
  await requireAdmin();
  await updateSubmissionStatus(id, status);
}
