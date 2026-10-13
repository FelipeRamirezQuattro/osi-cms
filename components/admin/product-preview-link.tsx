import { adminButtonClassName } from "@/components/admin/ui/button";

/**
 * Opens the staff-only draft preview of the SAVED product in a new tab (so QA
 * never has to type the URL). Needs a saved category, since the product's
 * public path is /products/<category>/<slug>; unsaved edits aren't shown.
 */
export function ProductPreviewLink({ categorySlug, slug }: { categorySlug: string | null; slug: string }) {
  if (!categorySlug) {
    return (
      <span className="text-xs text-[var(--admin-ink-secondary)]" title="Save a category first — the preview URL needs it">
        Preview needs a category
      </span>
    );
  }
  return (
    <a
      href={`/preview/products/${categorySlug}/${slug}`}
      target="_blank"
      rel="noreferrer"
      title="Opens the last saved version in a new tab"
      className={adminButtonClassName("secondary", "min-h-9 px-3 text-xs")}
    >
      Preview
    </a>
  );
}
