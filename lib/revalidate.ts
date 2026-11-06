import { revalidatePath } from "next/cache";

/**
 * Called by every Server Action that changes what the public site shows
 * (publish, unpublish, archive, restore, delete, settings, navigation...).
 * One layout-scoped revalidation covers the changed page, its parents, the
 * home page, /sitemap.xml and /search, and also drops the browser's Router
 * Cache for those paths so the editor's next visit renders the new content.
 * Public routes are already `force-dynamic`, so this is a guarantee, not a
 * workaround: it keeps working if a route is ever made cacheable.
 */
export function revalidatePublicSite() {
  revalidatePath("/", "layout");
}
