export interface AnnouncementBarSettings {
  enabled: boolean;
  message: string | null;
  link_url: string | null;
  link_label: string | null;
}

/**
 * site_settings.announcement_bar is untyped jsonb (see database.types.ts)
 * — this is the one place its shape is trusted, and only after this
 * shallow, defensive normalization. Anything malformed (wrong types,
 * not an object at all) degrades to "no announcement" rather than
 * throwing in app/(site)/layout.tsx, which every public route renders
 * through.
 *
 * Deliberately kept in a directive-free module, separate from the
 * interactive `AnnouncementBar` component (announcement-bar-client.tsx):
 * app/(site)/layout.tsx is a Server Component and calls this function
 * directly. A plain function exported from a `"use client"` module comes
 * through the flight loader as a reference that throws when called
 * server-side — the exact "client blocks must split their file" gotcha
 * documented in CLAUDE.md (see contact-form.tsx/contact-form-client.tsx,
 * stages-carousel.tsx/-carousel-client.tsx, video-embed.tsx/-embed-client.tsx)
 * — so this function can never live in the same file as the `"use client"`
 * component that uses its return type.
 */
export function normalizeAnnouncementBar(value: unknown): AnnouncementBarSettings | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  return {
    enabled: Boolean(record.enabled),
    message: typeof record.message === "string" ? record.message : null,
    link_url: typeof record.link_url === "string" ? record.link_url : null,
    link_label: typeof record.link_label === "string" ? record.link_label : null,
  };
}
