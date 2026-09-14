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
] as const;

export type Capability = (typeof CAPABILITIES)[number];

const EDITOR_CAPABILITIES: ReadonlySet<Capability> = new Set([
  "view_admin",
  "edit_drafts",
  "preview",
  "upload_media",
  "view_submissions",
  "manage_submissions",
]);

export function hasCapability(role: AdminRole, capability: Capability): boolean {
  return role === "admin" || EDITOR_CAPABILITIES.has(capability);
}
