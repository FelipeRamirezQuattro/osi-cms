import { z } from "zod";
import { optionalNullableString, optionalSafeHrefSchema } from "@/lib/validation/common";

/**
 * site_settings.announcement_bar (jsonb, 0007_nav_settings_media.sql) —
 * Task 7 item #12. `link_url` reuses optionalSafeHrefSchema (the same
 * isSafeHref-backed guard every other admin-editable link in this file
 * goes through), not a re-derived check.
 */
export const announcementBarSchema = z.object({
  enabled: z.boolean().default(false),
  message: optionalNullableString(),
  link_url: optionalSafeHrefSchema({ label: "Announcement link URL" }),
  link_label: optionalNullableString(),
});

export type AnnouncementBarInput = z.infer<typeof announcementBarSchema>;

/**
 * site_settings is a singleton row (supabase/migrations/0007) with every
 * column nullable — there's no "required" field here, only format
 * checks: email must look like an email when set, the map embed and
 * every social link must be a safe, real URL rather than a stray
 * `javascript:`/typo string an iframe or `<a href>` would otherwise
 * render verbatim (see components/blocks/contact-details.tsx).
 */
export const siteSettingsSchema = z.object({
  phone: optionalNullableString(),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().email("Enter a valid email address").nullable().default(null),
  ),
  // Editable as a repeatable text-line list in the admin UI
  // (saveSettingsAction already filters out blank lines before this
  // schema runs) — kept as a plain trimmed-string array, not
  // optionalNullableString per line, since an empty line here means
  // "remove it", not "store null in the array".
  address_lines: z.array(z.string().trim().min(1)).default([]),
  map_embed_url: optionalSafeHrefSchema({ label: "Map embed URL" }),
  social_facebook: optionalSafeHrefSchema({ label: "Facebook URL" }),
  social_linkedin: optionalSafeHrefSchema({ label: "LinkedIn URL" }),
  social_youtube: optionalSafeHrefSchema({ label: "YouTube URL" }),
  social_instagram: optionalSafeHrefSchema({ label: "Instagram URL" }),
  footer_tagline: optionalNullableString(),
  default_og_image: optionalNullableString(),
  announcement_bar: announcementBarSchema.default({
    enabled: false,
    message: null,
    link_url: null,
    link_label: null,
  }),
});

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
