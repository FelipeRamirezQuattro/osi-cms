import { afterEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { cleanup, render, screen } from "@testing-library/react";
import { AnnouncementBar } from "@/components/layout/announcement-bar-client";

afterEach(cleanup);

/**
 * Task 7 item #12. Covers the interactive banner component in isolation
 * (server snapshot only — matches recommendations-client.test.tsx's
 * reasoning for using renderToStaticMarkup over an interactive render:
 * useSyncExternalStore's server snapshot is what SSR/first paint
 * actually uses, and a real click-driven dismiss is a DOM-interaction
 * concern out of scope here).
 */

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

  it("degrades to 'not dismissed' rather than throwing when localStorage.getItem throws", () => {
    // A browser blocking site data (private mode, cookies/storage
    // disabled) throws on read, not just on write — the write path
    // already had a try/catch; this is the read-path regression a
    // reviewer caught after the first pass only guarded dismiss().
    //
    // renderToStaticMarkup (used by every other case in this file) never
    // exercises this: React's server-render path always calls
    // useSyncExternalStore's *server* snapshot, never the client one that
    // actually touches localStorage (see recommendations-client.test.tsx's
    // own comment on the same distinction). Only a real client render
    // (@testing-library/react's render()) reaches the guarded read.
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("localStorage disabled");
      },
    });
    try {
      expect(() =>
        render(<AnnouncementBar settings={{ enabled: true, message: "Hi", link_url: null, link_label: null }} />),
      ).not.toThrow();
      expect(screen.getByText("Hi")).toBeInTheDocument();
    } finally {
      if (original) Object.defineProperty(window, "localStorage", original);
    }
  });
});
