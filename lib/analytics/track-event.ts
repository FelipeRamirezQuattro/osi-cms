// Shared beacon sender for both pageview and custom-event tracking.
// Deliberately not a Server Action — sendBeacon can only POST to a URL,
// not invoke a function reference — so this always hits
// app/api/analytics/collect/route.ts directly. Never awaited by callers:
// analytics must never block or fail a real user interaction.

const COLLECT_URL = "/api/analytics/collect";

type PageviewPayload = {
  type: "pageview";
  path: string;
  referrer: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
};

type EventPayload = {
  type: "event";
  eventType: "button_click" | "contact_click";
  eventLabel: string;
  path: string;
  metadata?: Record<string, unknown>;
};

function send(payload: PageviewPayload | EventPayload): void {
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon(COLLECT_URL, blob)) return;
  }

  void fetch(COLLECT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function trackPageview(): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  send({
    type: "pageview",
    path: window.location.pathname,
    referrer: document.referrer || null,
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
  });
}

export function trackEvent(
  eventType: EventPayload["eventType"],
  eventLabel: string,
  metadata?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;

  send({
    type: "event",
    eventType,
    eventLabel,
    path: window.location.pathname,
    metadata,
  });
}
