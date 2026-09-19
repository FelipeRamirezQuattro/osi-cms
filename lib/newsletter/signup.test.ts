import { describe, expect, it } from "vitest";
import { CONFIRMATION_COOLDOWN_MINUTES, decideSignup } from "@/lib/newsletter/signup";

const NOW = new Date("2026-09-19T12:00:00Z");
const minutesAgo = (m: number) => new Date(NOW.getTime() - m * 60_000).toISOString();

describe("decideSignup", () => {
  it("creates a row for an email we have never seen", () => {
    expect(decideSignup(null, NOW)).toBe("create");
  });

  it("sends nothing to someone already subscribed", () => {
    expect(decideSignup({ status: "subscribed", confirmation_sent_at: minutesAgo(999) }, NOW)).toBe("already_subscribed");
  });

  it("re-sends a confirmation to a pending row once the cooldown has passed", () => {
    expect(decideSignup({ status: "pending", confirmation_sent_at: minutesAgo(CONFIRMATION_COOLDOWN_MINUTES + 1) }, NOW)).toBe(
      "send_confirmation",
    );
    expect(decideSignup({ status: "pending", confirmation_sent_at: null }, NOW)).toBe("send_confirmation");
  });

  it("holds back a repeat confirmation inside the cooldown window", () => {
    expect(decideSignup({ status: "pending", confirmation_sent_at: minutesAgo(1) }, NOW)).toBe("cooldown");
  });

  it("restarts double opt-in for someone who unsubscribed and signs up again", () => {
    expect(decideSignup({ status: "unsubscribed", confirmation_sent_at: minutesAgo(60 * 24) }, NOW)).toBe("send_confirmation");
    expect(decideSignup({ status: "unsubscribed", confirmation_sent_at: minutesAgo(2) }, NOW)).toBe("cooldown");
  });
});
