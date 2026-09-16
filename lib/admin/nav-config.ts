import type { AdminRole } from "@/lib/auth";
import { hasCapability, type Capability } from "@/lib/auth/capabilities";

/**
 * The admin sidebar's structure (Task 13a) — previously a single flat
 * array in app/admin/(dashboard)/layout.tsx. Pulled out to its own plain-
 * data module (same reasoning as lib/admin/entity-config.ts: no Zod/
 * Supabase import, safe from both the server layout and the client
 * sidebar/breadcrumb components) and grouped into labeled sections so the
 * sidebar reads as an information architecture, not an alphabetical dump.
 *
 * `capability: null` means "every active staff session sees this" (only
 * the dashboard landing page itself) — every other item is gated by the
 * exact capability its Server Action(s) require, so an editor never sees a
 * link to a section every action behind it would redirect them out of.
 */
export type AdminNavItem = { href: string; label: string; capability: Capability | null };
export type AdminNavGroup = { label: string; items: AdminNavItem[] };

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Overview",
    items: [{ href: "/admin", label: "Dashboard", capability: null }],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/pages", label: "Pages", capability: "edit_drafts" },
      { href: "/admin/shared-sections", label: "Shared sections", capability: "edit_drafts" },
      { href: "/admin/forms", label: "Forms", capability: "edit_drafts" },
      { href: "/admin/news", label: "News", capability: "edit_drafts" },
      { href: "/admin/resources", label: "Resources", capability: "edit_drafts" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { href: "/admin/products", label: "Products", capability: "edit_drafts" },
      { href: "/admin/product-categories", label: "Product categories", capability: "edit_drafts" },
      { href: "/admin/industries", label: "Industries", capability: "edit_drafts" },
      { href: "/admin/applications", label: "Applications", capability: "edit_drafts" },
    ],
  },
  {
    label: "Directory",
    items: [
      { href: "/admin/locations", label: "Locations", capability: "edit_drafts" },
      { href: "/admin/directory", label: "Directory", capability: "edit_drafts" },
    ],
  },
  {
    label: "Site setup",
    items: [
      { href: "/admin/navigation", label: "Navigation", capability: "manage_navigation" },
      { href: "/admin/media", label: "Media", capability: "upload_media" },
      { href: "/admin/branding", label: "Branding", capability: "manage_settings" },
      { href: "/admin/redirects", label: "Redirects", capability: "edit_drafts" },
      { href: "/admin/settings", label: "Settings", capability: "manage_settings" },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/admin/submissions", label: "Submissions", capability: "view_submissions" },
      { href: "/admin/users", label: "Users", capability: "manage_users" },
      { href: "/admin/audit-log", label: "Audit log", capability: "view_audit" },
    ],
  },
];

/** Drops items the current role can't use, then drops any group left with none — a role-restricted staff session never sees an empty group header. */
export function filterNavGroupsByRole(groups: AdminNavGroup[], role: AdminRole): AdminNavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.capability === null || hasCapability(role, item.capability)),
    }))
    .filter((group) => group.items.length > 0);
}
