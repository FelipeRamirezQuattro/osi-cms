import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  hashClientIp: vi.fn(),
  countRecentSignupsByIp: vi.fn(),
  createPendingSubscriber: vi.fn(),
  findSubscriberByEmail: vi.fn(),
  markConfirmationSent: vi.fn(),
  restartPendingSubscriber: vi.fn(),
  sendNewsletterConfirmation: vi.fn(),
}));

vi.mock("@/lib/actions/form-submission-pipeline", () => ({ hashClientIp: m.hashClientIp }));
vi.mock("@/lib/data/newsletter-subscribers", () => ({
  countRecentSignupsByIp: m.countRecentSignupsByIp,
  createPendingSubscriber: m.createPendingSubscriber,
  findSubscriberByEmail: m.findSubscriberByEmail,
  markConfirmationSent: m.markConfirmationSent,
  restartPendingSubscriber: m.restartPendingSubscriber,
}));
vi.mock("@/lib/email", () => ({ sendNewsletterConfirmation: m.sendNewsletterConfirmation }));

import { subscribeToNewsletter } from "@/lib/actions/subscribe-newsletter";
import { verifySubscriberToken } from "@/lib/newsletter/tokens";

const ID = "3f1c2b4a-5d6e-4f70-8a91-b2c3d4e5f607";
const idle = { status: "idle" as const };

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
}

describe("subscribeToNewsletter", () => {
  const originalSecret = process.env.NEWSLETTER_TOKEN_SECRET;

  beforeEach(() => {
    process.env.NEWSLETTER_TOKEN_SECRET = "test-secret";
    for (const fn of Object.values(m)) fn.mockReset();
    m.hashClientIp.mockResolvedValue("ip-hash");
    m.countRecentSignupsByIp.mockResolvedValue(0);
    m.findSubscriberByEmail.mockResolvedValue(null);
    m.createPendingSubscriber.mockResolvedValue({ id: ID });
    m.restartPendingSubscriber.mockResolvedValue({ id: ID });
    m.sendNewsletterConfirmation.mockResolvedValue(true);
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalSecret === undefined) delete process.env.NEWSLETTER_TOKEN_SECRET;
    else process.env.NEWSLETTER_TOKEN_SECRET = originalSecret;
  });

  it("rejects an invalid email without touching the database", async () => {
    const result = await subscribeToNewsletter(idle, form({ email: "not-an-email" }));
    expect(result.status).toBe("error");
    expect(m.findSubscriberByEmail).not.toHaveBeenCalled();
  });

  it("silently succeeds on a tripped honeypot without storing or emailing anything", async () => {
    const result = await subscribeToNewsletter(idle, form({ email: "a@example.com", website: "http://spam" }));
    expect(result.status).toBe("success");
    expect(m.createPendingSubscriber).not.toHaveBeenCalled();
    expect(m.sendNewsletterConfirmation).not.toHaveBeenCalled();
  });

  it("fails closed when NEWSLETTER_TOKEN_SECRET is not set", async () => {
    delete process.env.NEWSLETTER_TOKEN_SECRET;
    const result = await subscribeToNewsletter(idle, form({ email: "a@example.com" }));
    expect(result.status).toBe("error");
    expect(m.createPendingSubscriber).not.toHaveBeenCalled();
  });

  it("stores a new pending subscriber (lowercased) and emails a confirm link that verifies", async () => {
    const result = await subscribeToNewsletter(idle, form({ email: "  New@Example.COM ", pageSlug: "home" }));

    expect(result.status).toBe("success");
    expect(m.createPendingSubscriber).toHaveBeenCalledWith({ email: "new@example.com", ipHash: "ip-hash", pageSlug: "home" });

    const { to, confirmUrl } = m.sendNewsletterConfirmation.mock.calls[0]![0] as { to: string; confirmUrl: string };
    expect(to).toBe("new@example.com");
    const token = new URL(confirmUrl).searchParams.get("token");
    expect(new URL(confirmUrl).pathname).toBe("/newsletter/confirm");
    expect(verifySubscriberToken("confirm", token)).toBe(ID);
    expect(m.markConfirmationSent).toHaveBeenCalledWith(ID);
  });

  it("does not start the resend cooldown when the email was not actually sent", async () => {
    m.sendNewsletterConfirmation.mockResolvedValue(false);
    const result = await subscribeToNewsletter(idle, form({ email: "a@example.com" }));
    expect(result.status).toBe("success");
    expect(m.markConfirmationSent).not.toHaveBeenCalled();
  });

  it("gives the same success response for an already-subscribed address and sends nothing", async () => {
    m.findSubscriberByEmail.mockResolvedValue({ id: ID, status: "subscribed", confirmation_sent_at: null });
    const fresh = await subscribeToNewsletter(idle, form({ email: "b@example.com" }));
    m.findSubscriberByEmail.mockResolvedValue({ id: ID, status: "subscribed", confirmation_sent_at: null });
    const existing = await subscribeToNewsletter(idle, form({ email: "a@example.com" }));

    expect(existing).toEqual(fresh);
    expect(m.sendNewsletterConfirmation).not.toHaveBeenCalled();
  });

  it("does not re-send a confirmation inside the cooldown window", async () => {
    m.findSubscriberByEmail.mockResolvedValue({
      id: ID,
      status: "pending",
      confirmation_sent_at: new Date(Date.now() - 60_000).toISOString(),
    });
    const result = await subscribeToNewsletter(idle, form({ email: "a@example.com" }));
    expect(result.status).toBe("success");
    expect(m.sendNewsletterConfirmation).not.toHaveBeenCalled();
    expect(m.restartPendingSubscriber).not.toHaveBeenCalled();
  });

  it("restarts double opt-in for a previously unsubscribed address", async () => {
    m.findSubscriberByEmail.mockResolvedValue({ id: ID, status: "unsubscribed", confirmation_sent_at: null });
    await subscribeToNewsletter(idle, form({ email: "a@example.com" }));
    expect(m.restartPendingSubscriber).toHaveBeenCalledWith(ID, { ipHash: "ip-hash", pageSlug: null });
    expect(m.createPendingSubscriber).not.toHaveBeenCalled();
    expect(m.sendNewsletterConfirmation).toHaveBeenCalled();
  });

  it("blocks an IP that has signed up too many addresses recently", async () => {
    m.countRecentSignupsByIp.mockResolvedValue(5);
    const result = await subscribeToNewsletter(idle, form({ email: "a@example.com" }));
    expect(result.status).toBe("error");
    expect(m.createPendingSubscriber).not.toHaveBeenCalled();
  });

  it("returns a generic error (not the exception) when the database fails", async () => {
    m.findSubscriberByEmail.mockRejectedValue(new Error("connection refused: secret detail"));
    const result = await subscribeToNewsletter(idle, form({ email: "a@example.com" }));
    expect(result.status).toBe("error");
    expect(result.message).not.toContain("secret detail");
  });
});
