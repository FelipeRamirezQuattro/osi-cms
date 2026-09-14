const encodeSegment = (value: string) => encodeURIComponent(value.trim());

export function pageHref(slug: string): string {
  const normalized = slug.trim().replace(/^\/+|\/+$/g, "");
  return normalized === "" || normalized === "home" ? "/" : `/${normalized}`;
}

export function productHref(categorySlug: string, productSlug: string): string {
  return `/products/${encodeSegment(categorySlug)}/${encodeSegment(productSlug)}`;
}

export const newsHref = (slug?: string) => (slug ? `/news/${encodeSegment(slug)}` : "/news");
export const resourceHref = () => "/resources";
export const industryHref = (slug: string) => `/industries/${encodeSegment(slug)}`;
export const applicationHref = (slug: string) => `/applications/${encodeSegment(slug)}`;
export const previewHref = (slug: string) => `/preview/${slug.trim().replace(/^\/+|\/+$/g, "")}`;
export const adminHref = (section: string, id?: string) =>
  `/admin/${encodeSegment(section)}${id ? `/${encodeSegment(id)}` : ""}`;

export function isSafeHref(value: string, options: { allowAnchor?: boolean; allowContact?: boolean } = {}): boolean {
  const href = value.trim();
  if (!href) return false;
  if (options.allowAnchor && /^#[A-Za-z][\w:.-]*$/.test(href)) return true;
  if (href.startsWith("/") && !href.startsWith("//")) return true;
  if (options.allowContact && /^(mailto:|tel:)[^\s]+$/i.test(href)) return true;
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isExternalHref(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}
