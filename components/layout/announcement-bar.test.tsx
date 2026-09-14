import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AnnouncementBar, normalizeAnnouncementBar } from "@/components/layout/announcement-bar";

/**
 * Task 7 item #12: site_settings.announcement_bar existed as a column
 * with zero admin UI and zero public rendering. Covers the banner
 * component in isolation (server snapshot only — matches
 * recommendations-client.test.tsx's reasoning for using
 * renderToStaticMarkup over an interactive render: useSyncExternalStore's
 * server snapshot is what SSR/first paint actually uses, and a real
 * click-driven dismiss is a DOM-interaction concern out of scope here).
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

describe("AnnouncementBar", () => {
  it("renders nothing when disabled", () => {
    const html = renderToStaticMarkup(
      <AnnouncementBar settings={{ enabled: false, message: "Hi", link_url: null, link_label: null }} />,
    );
    expect(html).toBe("");
  });

  it("renders nothing when there is no message", () => {
    const html = renderToStaticMarkup(
      <AnnouncementBar settings={{ enabled: true, message: null, link_url: null, link_label: null }} />,
    );
    expect(html).toBe("");
  });

  it("renders the message and a dismiss control when enabled", () => {
    const html = renderToStaticMarkup(
      <AnnouncementBar
        settings={{ enabled: true, message: "Now shipping to Colombia", link_url: null, link_label: null }}
      />,
    );
    const container = document.createElement("div");
    container.innerHTML = html;
    expect(container.textContent).toContain("Now shipping to Colombia");
    expect(container.querySelector('button[aria-label="Dismiss announcement"]')).not.toBeNull();
  });

  it("renders the link only when both link_url and link_label are present", () => {
    const withBoth = renderToStaticMarkup(
      <AnnouncementBar
        settings={{ enabled: true, message: "Hi", link_url: "/contact", link_label: "Get in touch" }}
      />,
    );
    const container1 = document.createElement("div");
    container1.innerHTML = withBoth;
    expect(container1.querySelector('a[href="/contact"]')?.textContent).toBe("Get in touch");

    const linkOnlyNoLabel = renderToStaticMarkup(
      <AnnouncementBar settings={{ enabled: true, message: "Hi", link_url: "/contact", link_label: null }} />,
    );
    const container2 = document.createElement("div");
    container2.innerHTML = linkOnlyNoLabel;
    expect(container2.querySelector("a")).toBeNull();
  });

  it("never renders an unsafe link_url as a real href", () => {
    const html = renderToStaticMarkup(
      <AnnouncementBar
        settings={{ enabled: true, message: "Hi", link_url: "javascript:alert(1)", link_label: "Click me" }}
      />,
    );
    const container = document.createElement("div");
    container.innerHTML = html;
    expect(container.querySelector("a")).toBeNull();
  });
});
