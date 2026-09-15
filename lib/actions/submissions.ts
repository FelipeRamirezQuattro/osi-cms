"use server";

import { requireCapability } from "@/lib/auth";
import { listSubmissions, updateSubmissionStatus } from "@/lib/data/forms";
import { buildSubmissionsCsv } from "@/lib/admin/submissions-csv";
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

/**
 * Task 15's approved-scope submissions export: `view_submissions` is
 * enough (same gate the inbox list itself uses) since exporting is a
 * read, not a triage action. Returns the CSV text directly — the client
 * component (submissions-inbox.tsx) turns it into a downloadable Blob,
 * since there's no file-response path for a Server Action to return.
 * Retention: no automated purge (see docs/DECISIONS.md) — a manual
 * delete already exists at the DB level via the "staff can delete
 * submissions" RLS policy (0008_forms_ops.sql); no new deletion UI was
 * added since none was asked for and the existing archive/triage flow
 * already covers day-to-day inbox hygiene.
 */
export async function exportSubmissionsCsvAction(): Promise<string> {
  await requireCapability("view_submissions");
  const rows = await listSubmissions();
  return buildSubmissionsCsv(rows);
}
