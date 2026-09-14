"use server";

import { requireCapability } from "@/lib/auth";
import { listSubmissions, updateSubmissionStatus } from "@/lib/data/forms";
import type { Tables } from "@/lib/db/database.types";

export async function listSubmissionsAction(): Promise<Tables<"form_submissions">[]> {
  await requireCapability("view_submissions");
  return listSubmissions();
}

// Status here is just a triage flag ("new" -> "read"/"archived", see
// lib/data/forms.ts) — never a delete — so this is the same
// day-to-day capability editors already get for viewing submissions,
// per CLAUDE.md/capabilities.ts's manage_submissions ruling.
export async function updateSubmissionStatusAction(
  id: string,
  status: Tables<"form_submissions">["status"],
): Promise<void> {
  await requireCapability("manage_submissions");
  await updateSubmissionStatus(id, status);
}
