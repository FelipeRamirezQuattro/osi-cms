/**
 * Single seam for legacy Wix-hosted media (see CLAUDE.md, constraint 3).
 * Every media URL rendered anywhere in the app must pass through this
 * function so re-hosting into Supabase Storage or a CDN later is a
 * one-file change.
 */
export function resolveMediaUrl(url: string): string {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }
  const base = process.env.NEXT_PUBLIC_LEGACY_MEDIA_BASE;
  if (!base) {
    throw new Error("NEXT_PUBLIC_LEGACY_MEDIA_BASE is not set");
  }
  return `${base.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}
