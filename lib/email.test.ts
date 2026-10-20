import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { send, batchSend, record } = vi.hoisted(() => ({
  send: vi.fn(),
  batchSend: vi.fn(),
  record: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
    batch = { send: batchSend };
  },
}));
vi.mock("@/lib/data/email-outbox", () => ({ recordOutboxMessage: record }));
vi.mock("@/lib/email-brand", () => ({
  getEmailBrand: async () => ({
    siteName: "Odessa Separator",
    logoUrl: null,
    logoAlt: "Odessa Separator",
    headerBackground: "#001B33",
    headerText: "#FFFFFF",
    link: "#001B33",
    pageBackground: "#F2E9DE",
  }),
}));

import {
  deliver,
  getEmailMode,
  sendCampaignBatch,
  sendCampaignTest,
  sendContactConfirmation,
  sendContactNotification,
  sendNewsletterConfirmation,
  sendNewsletterWelcome,
} from "@/lib/email";

const contact = { firstName: "Ada", lastName: "L", email: "ada@example.com", phone: "1", message: "hello" };
const message = { kind: "test", to: "to@example.com", subject: "Subject", text: "Body" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  send.mockResolvedValue({ data: { id: "msg_1" }, error: null });
  record.mockResolvedValue(true);
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getEmailMode", () => {
  it("is unconfigured without a key and sender", () => {
    expect(getEmailMode({})).toBe("unconfigured");
    expect(getEmailMode({ RESEND_API_KEY: "k" })).toBe("unconfigured");
  });
  it("is live with a key and a sender", () => {
    expect(getEmailMode({ RESEND_API_KEY: "k", RESEND_FROM_EMAIL: "a@b.co" })).toBe("live");
  });
  it("dry-run wins over a configured key", () => {
    expect(getEmailMode({ EMAIL_DRY_RUN: "true", RESEND_API_KEY: "k", RESEND_FROM_EMAIL: "a@b.co" })).toBe("dry-run");
  });
});

describe("deliver", () => {
  it("unconfigured: skips, sends nothing, stores nothing", async () => {
    expect(await deliver(message)).toMatchObject({ status: "skipped" });
    expect(send).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it("dry-run: stores the message in the outbox and never calls the provider", async () => {
    vi.stubEnv("EMAIL_DRY_RUN", "true");
    vi.stubEnv("RESEND_API_KEY", "k");
    vi.stubEnv("RESEND_FROM_EMAIL", "OSI <noreply@quattro.test>");
    expect(await deliver({ ...message, html: "<p>x</p>" })).toEqual({ status: "dry-run" });
    expect(send).not.toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ to: "to@example.com", from: "OSI <noreply@quattro.test>", html: "<p>x</p>" }));
  });

  it("live: sends from RESEND_FROM_EMAIL with html, text and headers", async () => {
    vi.stubEnv("RESEND_API_KEY", "k");
    vi.stubEnv("RESEND_FROM_EMAIL", "OSI <noreply@quattro.test>");
    const result = await deliver({ ...message, html: "<p>x</p>", replyTo: "r@example.com", headers: { "X-Test": "1" } });
    expect(result).toEqual({ status: "sent", id: "msg_1" });
    expect(send).toHaveBeenCalledWith({
      from: "OSI <noreply@quattro.test>",
      to: "to@example.com",
      subject: "Subject",
      text: "Body",
      html: "<p>x</p>",
      replyTo: "r@example.com",
      headers: { "X-Test": "1" },
    });
  });

  it("live: a provider rejection or throw is reported, never thrown", async () => {
    vi.stubEnv("RESEND_API_KEY", "k");
    vi.stubEnv("RESEND_FROM_EMAIL", "a@b.co");
    send.mockResolvedValueOnce({ data: null, error: { message: "bad domain", statusCode: 403 } });
    expect(await deliver(message)).toMatchObject({ status: "failed", retryable: false });
    send.mockRejectedValueOnce(new Error("network"));
    expect(await deliver(message)).toMatchObject({ status: "failed", retryable: true });
  });
});

describe("message senders", () => {
  beforeEach(() => {
    vi.stubEnv("EMAIL_DRY_RUN", "true");
  });

  it("contact notification goes to CONTACT_NOTIFICATION_EMAIL with Reply-To the visitor", async () => {
    vi.stubEnv("CONTACT_NOTIFICATION_EMAIL", "sales@osi.test");
    await sendContactNotification(contact);
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "contact-notification", to: "sales@osi.test", replyTo: "ada@example.com", html: expect.stringContaining("Ada L") }),
    );
  });

  it("contact notification without a recipient is skipped when not in dry-run", async () => {
    vi.stubEnv("EMAIL_DRY_RUN", "");
    await sendContactNotification(contact);
    expect(record).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it("visitor confirmation goes to the visitor", async () => {
    await sendContactConfirmation(contact);
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ kind: "contact-confirmation", to: "ada@example.com" }));
  });

  it("newsletter confirmation reports whether it was handed off", async () => {
    expect(await sendNewsletterConfirmation({ to: "n@example.com", confirmUrl: "https://x.test/c" })).toBe(true);
    vi.stubEnv("EMAIL_DRY_RUN", "");
    expect(await sendNewsletterConfirmation({ to: "n@example.com", confirmUrl: "https://x.test/c" })).toBe(false);
  });

  it("welcome carries List-Unsubscribe and the one-click header", async () => {
    await sendNewsletterWelcome({ to: "n@example.com", unsubscribeUrl: "https://x.test/u?t=1", oneClickUnsubscribeUrl: "https://x.test/api/u?t=1" });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "newsletter-welcome",
        headers: { "List-Unsubscribe": "<https://x.test/api/u?t=1>", "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      }),
    );
  });
});

describe("campaigns", () => {
  const campaignEmail = { to: "a@b.co", subject: "S", html: "<p/>", text: "t", oneClickUnsubscribeUrl: "https://x.test/u" };

  it("a dry-run never sends a campaign (preview deployments share the live database)", async () => {
    vi.stubEnv("EMAIL_DRY_RUN", "true");
    const result = await sendCampaignBatch([campaignEmail], "key");
    expect(result).toMatchObject({ ok: false, retryable: false });
    expect(batchSend).not.toHaveBeenCalled();
  });

  it("test send sets List-Unsubscribe when given a page URL, and stores in dry-run", async () => {
    vi.stubEnv("EMAIL_DRY_RUN", "true");
    const result = await sendCampaignTest({ to: "me@osi.test", subject: "[Test] S", html: "<p/>", text: "t", unsubscribePageUrl: "https://x.test/newsletter/unsubscribe" });
    expect(result).toEqual({ ok: true });
    expect(record).toHaveBeenCalledWith(expect.objectContaining({ kind: "campaign-test", headers: { "List-Unsubscribe": "<https://x.test/newsletter/unsubscribe>" } }));
  });
});
