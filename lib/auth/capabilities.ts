import type { AdminRole } from "@/lib/auth";

export const CAPABILITIES = [
  "view_admin",
  "edit_drafts",
  "preview",
  "publish",
  "delete_content",
  "manage_taxonomy",
  "upload_media",
  "delete_media",
  "manage_navigation",
  "manage_settings",
  "view_submissions",
  "manage_submissions",
  "manage_users",
  "view_audit",
  "view_analytics",
  "manage_newsletter",
] as const;

export type Capability = (typeof CAPABILITIES)[number];

// Minimum policy (see the Task 4 brief / CLAUDE.md): editors get
// view admin, create/edit drafts, preview, upload media, view
// submissions. Two decisions the brief left open, made explicitly here:
//
// - `manage_submissions` (archiving/marking a submission read) IS
//   editor-permitted — it's a triage status flip on a row the editor can
//   already view (`view_submissions`), never a delete, so it's day-to-day
//   admin work rather than a destructive/structural action. See
//   lib/actions/submissions.ts.
// - `delete_media` is NOT editor-permitted (admin-only, i.e. absent from
//   this set) — deleting an uploaded asset can silently break any page
//   still referencing it, so that's judged destructive-content-adjacent
//   like `delete_content`, even though uploading (`upload_media`) is
//   safe day-to-day work.
//
// `manage_taxonomy` is deliberately absent from this set too: it's
// reserved for taxonomy STRUCTURE changes (renaming/reordering a whole
// category), which don't exist as a distinct operation anywhere in the
// codebase today — industries/applications/etc. are flat content rows,
// and editing or reordering one row is ordinary `edit_drafts` work (see
// lib/actions/entities.ts). If a real taxonomy-structure action is ever
// added, gate it with `manage_taxonomy` instead of `edit_drafts`.
const EDITOR_CAPABILITIES: ReadonlySet<Capability> = new Set([
  "view_admin",
  "edit_drafts",
  "preview",
  "upload_media",
  "view_submissions",
  "manage_submissions",
  // Read-only, non-destructive — same reasoning as view_submissions.
  "view_analytics",
  // Subscribers, tags and campaigns are day-to-day marketing work, like
  // submissions triage. Deleting a subscriber stays admin-only
  // (delete_content) — see lib/actions/newsletter-subscribers.ts.
  "manage_newsletter",
]);

export function hasCapability(role: AdminRole, capability: Capability): boolean {
  return role === "admin" || EDITOR_CAPABILITIES.has(capability);
}
