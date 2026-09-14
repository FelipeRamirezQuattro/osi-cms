"use client";

import { useState, useSyncExternalStore } from "react";
import { isSafeHref } from "@/lib/routes";

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

/**
 * Per-viewer dismissal is keyed off a hash of the message text (not a
 * fixed "osi:announcement-dismissed" key) so that changing the
 * announcement's copy in the admin makes it reappear for everyone who
 * already dismissed the old one — an admin publishing a new message is
 * a new announcement as far as a viewer's dismissal history is
 * concerned, not a re-show of something they already closed. A plain
 * (non-cryptographic) hash is fine here: the only property that matters
 * is "same text -> same key," not collision-resistance.
 */
function dismissalKey(message: string): string {
  let hash = 0;
  for (let i = 0; i < message.length; i++) {
    hash = (Math.imul(31, hash) + message.charCodeAt(i)) | 0;
  }
  return `osi:announcement-dismissed:${hash}`;
}

function subscribeToNothing() {
  // localStorage doesn't emit events for same-tab writes, and this
  // component's own dismiss() below updates React state directly rather
  // than relying on this subscription to notice its own write — nothing
  // to subscribe to (same reasoning as recommendations-client.tsx).
  return () => {};
}

function getServerSnapshot(): boolean {
  return false;
}

export function AnnouncementBar({ settings }: { settings: AnnouncementBarSettings | null }) {
  const message = settings?.message?.trim() || null;
  const key = message ? dismissalKey(message) : null;

  // Whether *this browser* already dismissed this exact message,
  // read via useSyncExternalStore rather than useState+useEffect — a
  // plain synchronous localStorage read needs no effect at all, and
  // reading it in an effect body would just be a setState call with an
  // extra render in between (flagged by this repo's lint rule against
  // setState-in-effect).
  const previouslyDismissed = useSyncExternalStore(
    subscribeToNothing,
    () => (key ? localStorage.getItem(key) === "1" : false),
    getServerSnapshot,
  );
  // The dismiss button's own click needs to hide the bar immediately,
  // in the same render pass — a normal event-handler state update, not
  // an effect, so it's exempt from that same lint rule.
  const [dismissedThisSession, setDismissedThisSession] = useState(false);
  const dismissed = previouslyDismissed || dismissedThisSession;

  if (!settings?.enabled || !message || dismissed) return null;

  const href = settings.link_url && isSafeHref(settings.link_url, { allowAnchor: true, allowContact: true })
    ? settings.link_url
    : null;
  const linkLabel = settings.link_label?.trim() || null;

  function dismiss() {
    setDismissedThisSession(true);
    if (!key) return;
    try {
      localStorage.setItem(key, "1");
    } catch {
      // localStorage unavailable — the bar reappears next visit for this
      // viewer, no worse than not offering dismissal at all.
    }
  }

  return (
    <div
      role="region"
      aria-label="Announcement"
      className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-osi-navy-900 px-4 py-2 text-center text-osi-white"
    >
      <span className="font-display text-xs tracking-wide-label uppercase">{message}</span>
      {href && linkLabel && (
        <a
          href={href}
          className="font-display text-xs tracking-wide-label text-osi-gold-500 uppercase underline underline-offset-2 hover:text-osi-gold-400"
        >
          {linkLabel}
        </a>
      )}
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss announcement"
        className="ml-2 text-osi-white/70 transition-colors duration-200 hover:text-osi-white"
      >
        ✕
      </button>
    </div>
  );
}
