import { pageHref, productHref } from "@/lib/routes";

/**
 * Turns one `redirect_index()` row (migration 0052) into the path a visitor is sent to.
 * Pure — the SQL function does the join, the rules live here so they're unit-tested.
 *
 *  path    -> to_path as stored.
 *  product -> published: its current URL (/products/<category>/<slug>);
 *             draft with a category: that category's listing, /products?category=<slug>
 *             (the product grid on /products filters by that query param — there is no
 *             /products/<category> route, so a path like that would be a soft 404);
 *             no category: /products.
 *  page    -> published: its path; otherwise the row's fallback_path, else "/".
 *  none    -> the target row was deleted: fallback_path, else /products.
 */
export type RedirectIndexRow = {
  from_path: string;
  to_path: string | null;
  status_code: number;
  target_kind: string;
  product_published: boolean | null;
  product_slug: string | null;
  category_slug: string | null;
  page_published: boolean | null;
  page_slug: string | null;
  fallback_path: string | null;
};

export const PRODUCTS_LISTING = "/products";

export function productCategoryListing(categorySlug: string): string {
  return `${PRODUCTS_LISTING}?category=${encodeURIComponent(categorySlug)}`;
}

export function resolveRedirectTarget(row: RedirectIndexRow): string {
  switch (row.target_kind) {
    case "product":
      if (row.product_published && row.product_slug && row.category_slug) {
        return productHref(row.category_slug, row.product_slug);
      }
      return row.category_slug ? productCategoryListing(row.category_slug) : PRODUCTS_LISTING;
    case "page":
      return row.page_published && row.page_slug !== null ? pageHref(row.page_slug) : (row.fallback_path ?? "/");
    case "path":
      return row.to_path ?? "/";
    default:
      return row.fallback_path ?? PRODUCTS_LISTING;
  }
}
