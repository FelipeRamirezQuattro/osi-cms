import { describe, expect, it } from "vitest";
import { normalizeAnnouncementBar } from "@/components/layout/announcement-bar";

/**
 * Task 7 item #12: site_settings.announcement_bar existed as a column
 * with zero admin UI and zero public rendering.
 *
 * normalizeAnnouncementBar lives in a directive-free module, separate
 * from the interactive AnnouncementBar component
 * (announcement-bar-client.test.tsx covers that one) — see this file's
 * own comment for why: app/(site)/layout.tsx (a Server Component) calls
 * this function directly, and a plain function exported from a
 * `"use client"` module throws when called server-side (Next's flight
 * loader rewrites it into a reference, not the real function). That was
 * a real bug in this task's first pass, caught in review, not by this
 * test suite — `pnpm build` never prerenders `app/(site)/` routes
 * (`force-dynamic`), and importing the module directly in a test has no
 * RSC boundary to trip over. The fix is structural (this file split);
 * the only way to actually re-verify it is booting a real server and
 * requesting a page — see the task report.
 */

describe("normalizeAnnouncementBar", () => {
  it("returns null for anything that isn't a plain object", () => {
    expect(normalizeAnnouncementBar(null)).toBeNull();
    expect(normalizeAnnouncementBar(undefined)).toBeNull();
    expect(normalizeAnnouncementBar("not an object")).toBeNull();
  });

  it("coerces missing/malformed fields to safe defaults", () => {
    expect(normalizeAnnouncementBar({})).toEqual({
      enabled: false,
      message: null,
      link_url: null,
      link_label: null,
    });
    expect(normalizeAnnouncementBar({ enabled: "yes", message: 123 })).toEqual({
      enabled: true,
      message: null,
      link_url: null,
      link_label: null,
    });
  });
});
