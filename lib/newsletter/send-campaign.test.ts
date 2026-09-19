import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const d = vi.hoisted(() => ({
  claimCampaignForSending: vi.fn(),
  countAudience: vi.fn(),
  finalizeCampaign: vi.fn(),
  getCampaign: vi.fn(),
  getCampaignStats: vi.fn(),
  listPendingRecipients: vi.fn(),
  prepareRecipients: vi.fn(),
  recordRecipientOutcomes: vi.fn(),
}));
const sendCampaignBatch = vi.hoisted(() => vi.fn());

vi.mock("@/lib/data/newsletter-campaigns", () => d);
vi.mock("@/lib/email", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/email")>()),
  sendCampaignBatch,
}));

import { checkCampaignSendable, sendCampaignStep } from "@/lib/newsletter/send-campaign";
import { verifySubscriberToken } from "@/lib/newsletter/tokens";

const ENV = {
  RESEND_API_KEY: "k",
  RESEND_FROM_EMAIL: "News <news@example.com>",
  NEWSLETTER_TOKEN_SECRET: "test-secret",
  NEWSLETTER_MAILING_ADDRESS: "1 Test Street, Odessa, TX",
};
const saved: Record<string, string | undefined> = {};

const CID = "c0000000-0000-4000-8000-000000000001";
const sid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const blocks = [{ type: "heading", data: { text: "Hello", size: "large", align: "left" } }];

function campaign(overrides: Record<string, unknown> = {}) {
  return {
    id: CID,
    name: "Sept",
    subject: "September update",
    preheader: "",
    blocks,
    tag_ids: [],
    status: "draft",
    total_recipients: null,
    ...overrides,
  };
}
function recipient(n: number, subscriberStatus = "subscribed") {
  return { recipientId: `r${n}`, subscriberId: sid(n), email: `p${n}@example.com`, subscriberStatus };
}
const stats = (over: Partial<Record<"pending" | "sent" | "failed" | "skipped", number>> = {}) => ({ pending: 0, sent: 0, failed: 0, skipped: 0, ...over });

describe("sendCampaignStep", () => {
  beforeEach(() => {
    for (const [key, value] of Object.entries(ENV)) {
      saved[key] = process.env[key];
      process.env[key] = value;
    }
    for (const fn of Object.values(d)) fn.mockReset();
    sendCampaignBatch.mockReset();
    d.getCampaign.mockResolvedValue(campaign());
    d.countAudience.mockResolvedValue(2);
    d.claimCampaignForSending.mockResolvedValue(campaign({ status: "sending" }));
    d.prepareRecipients.mockResolvedValue(2);
    d.finalizeCampaign.mockResolvedValue("sent");
    d.recordRecipientOutcomes.mockResolvedValue(undefined);
    d.listPendingRecipients.mockResolvedValueOnce([recipient(1), recipient(2)]).mockResolvedValue([]);
    d.getCampaignStats.mockResolvedValue(stats({ sent: 2 }));
    sendCampaignBatch.mockImplementation(async (messages: unknown[]) => ({ ok: true, ids: messages.map((_, i) => `msg-${i}`) }));
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("refuses to send until the email settings are complete, naming what is missing", async () => {
    delete process.env.NEWSLETTER_MAILING_ADDRESS;
    const result = await sendCampaignStep(CID);
    expect(result).toEqual({ ok: false, message: expect.stringContaining("NEWSLETTER_MAILING_ADDRESS") });
    expect(d.getCampaign).not.toHaveBeenCalled();
    expect(sendCampaignBatch).not.toHaveBeenCalled();
  });

  it.each([
    ["has no subject", { subject: "  " }, "subject"],
    ["has no content", { blocks: [] }, "content"],
    ["has an invalid block", { blocks: [{ type: "heading", data: { text: "" } }] }, "Heading"],
  ])("does not claim or send a draft that %s", async (_label, overrides, expected) => {
    d.getCampaign.mockResolvedValue(campaign(overrides));
    const result = await sendCampaignStep(CID);
    expect(result).toMatchObject({ ok: false });
    expect(JSON.stringify(result)).toContain(expected);
    expect(d.claimCampaignForSending).not.toHaveBeenCalled();
    expect(sendCampaignBatch).not.toHaveBeenCalled();
  });

  it("does not send to an empty audience", async () => {
    d.countAudience.mockResolvedValue(0);
    const result = await sendCampaignStep(CID);
    expect(result.ok).toBe(false);
    expect(d.claimCampaignForSending).not.toHaveBeenCalled();
  });

  it("starts a draft, sends every subscriber their own unsubscribe link, and finalizes", async () => {
    const result = await sendCampaignStep(CID);

    expect(d.claimCampaignForSending).toHaveBeenCalledWith(CID);
    expect(d.prepareRecipients).toHaveBeenCalledWith(CID, []);
    expect(result).toEqual({ ok: true, progress: expect.objectContaining({ status: "sent", done: true, sent: 2 }) });

    const messages = sendCampaignBatch.mock.calls[0]![0] as { to: string; subject: string; html: string; text: string; oneClickUnsubscribeUrl: string }[];
    expect(messages.map((m) => m.to)).toEqual(["p1@example.com", "p2@example.com"]);
    expect(messages[0]!.subject).toBe("September update");
    for (const [i, message] of messages.entries()) {
      const link = message.html.match(/href="([^"]*newsletter\/unsubscribe[^"]*)"/)![1]!;
      expect(verifySubscriberToken("unsubscribe", new URL(link).searchParams.get("token"))).toBe(sid(i + 1));
      expect(message.html).not.toContain("%%UNSUBSCRIBE_URL%%");
      expect(message.text).not.toContain("%%UNSUBSCRIBE_URL%%");
      expect(message.html).toContain("1 Test Street, Odessa, TX");
      expect(new URL(message.oneClickUnsubscribeUrl).pathname).toBe("/api/newsletter/unsubscribe");
    }
    expect(messages[0]!.html).not.toBe(messages[1]!.html);

    expect(d.recordRecipientOutcomes).toHaveBeenCalledWith(CID, [
      expect.objectContaining({ recipientId: "r1", status: "sent", providerMessageId: "msg-0" }),
      expect.objectContaining({ recipientId: "r2", status: "sent", providerMessageId: "msg-1" }),
    ]);
    expect(d.finalizeCampaign).toHaveBeenCalled();
  });

  it("skips anyone who unsubscribed after the audience was snapshotted", async () => {
    d.listPendingRecipients.mockReset().mockResolvedValueOnce([recipient(1), recipient(2, "unsubscribed")]).mockResolvedValue([]);
    await sendCampaignStep(CID);

    const messages = sendCampaignBatch.mock.calls[0]![0] as { to: string }[];
    expect(messages.map((m) => m.to)).toEqual(["p1@example.com"]);
    expect(d.recordRecipientOutcomes).toHaveBeenCalledWith(CID, [
      expect.objectContaining({ recipientId: "r2", status: "skipped" }),
      expect.objectContaining({ recipientId: "r1", status: "sent" }),
    ]);
  });

  it("leaves a batch pending and does not finalize when the provider is rate limiting", async () => {
    sendCampaignBatch.mockResolvedValue({ ok: false, retryable: true, message: "Too many requests" });
    d.getCampaignStats.mockResolvedValue(stats({ pending: 2 }));

    const result = await sendCampaignStep(CID);

    expect(result).toEqual({ ok: true, progress: expect.objectContaining({ status: "sending", done: false, retryMessage: "Too many requests" }) });
    expect(d.recordRecipientOutcomes).toHaveBeenCalledWith(CID, []);
    expect(d.finalizeCampaign).not.toHaveBeenCalled();
  });

  it("marks a rejected batch failed, and the campaign failed when nothing was delivered", async () => {
    sendCampaignBatch.mockResolvedValue({ ok: false, retryable: false, message: "Invalid from address" });
    d.getCampaignStats.mockResolvedValue(stats({ failed: 2 }));
    d.finalizeCampaign.mockResolvedValue("failed");

    const result = await sendCampaignStep(CID);

    expect(d.recordRecipientOutcomes).toHaveBeenCalledWith(CID, [
      expect.objectContaining({ status: "failed", error: "Invalid from address" }),
      expect.objectContaining({ status: "failed", error: "Invalid from address" }),
    ]);
    expect(result).toEqual({ ok: true, progress: expect.objectContaining({ status: "failed", done: true, failed: 2 }) });
  });

  it("stops at the time budget and reports the rest as still pending", async () => {
    d.getCampaign.mockResolvedValue(campaign({ status: "sending", total_recipients: 4 }));
    d.listPendingRecipients.mockReset().mockResolvedValue([recipient(1), recipient(2)]);
    d.getCampaignStats.mockResolvedValue(stats({ sent: 2, pending: 2 }));
    let clock = 0;
    const now = () => (clock += 5000);

    const result = await sendCampaignStep(CID, { budgetMs: 1000, now });

    expect(sendCampaignBatch).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true, progress: expect.objectContaining({ status: "sending", done: false, pending: 2, total: 4 }) });
    expect(d.finalizeCampaign).not.toHaveBeenCalled();
  });

  it("resumes a sending campaign without re-claiming or re-snapshotting recipients", async () => {
    d.getCampaign.mockResolvedValue(campaign({ status: "sending", total_recipients: 2 }));
    await sendCampaignStep(CID);
    expect(d.claimCampaignForSending).not.toHaveBeenCalled();
    expect(d.prepareRecipients).not.toHaveBeenCalled();
    expect(sendCampaignBatch).toHaveBeenCalled();
  });

  it("finishes preparing recipients for a campaign interrupted before its audience was snapshotted", async () => {
    d.getCampaign.mockResolvedValue(campaign({ status: "sending", total_recipients: null }));
    await sendCampaignStep(CID);
    expect(d.prepareRecipients).toHaveBeenCalledWith(CID, []);
    expect(d.claimCampaignForSending).not.toHaveBeenCalled();
  });

  it("reports a finished campaign's progress without sending anything again", async () => {
    d.getCampaign.mockResolvedValue(campaign({ status: "sent", total_recipients: 2 }));
    const result = await sendCampaignStep(CID);
    expect(sendCampaignBatch).not.toHaveBeenCalled();
    expect(d.listPendingRecipients).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, progress: expect.objectContaining({ status: "sent", done: true }) });
  });

  it("uses the same idempotency key when the identical batch is retried", async () => {
    d.getCampaign.mockResolvedValue(campaign({ status: "sending", total_recipients: 2 }));
    d.listPendingRecipients.mockReset().mockResolvedValueOnce([recipient(1), recipient(2)]).mockResolvedValueOnce([]).mockResolvedValueOnce([recipient(1), recipient(2)]).mockResolvedValue([]);
    await sendCampaignStep(CID);
    await sendCampaignStep(CID);
    const keys = sendCampaignBatch.mock.calls.map((call) => call[1]);
    expect(keys).toHaveLength(2);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[0]).toMatch(new RegExp(`^campaign-${CID}-`));
  });

  it("handles a campaign that does not exist", async () => {
    d.getCampaign.mockResolvedValue(null);
    expect(await sendCampaignStep(CID)).toEqual({ ok: false, message: "Campaign not found." });
  });
});

describe("checkCampaignSendable", () => {
  it("explains a tag-filtered audience with nobody in it", async () => {
    d.countAudience.mockResolvedValue(0);
    const message = await checkCampaignSendable(campaign({ tag_ids: ["t1"] }) as never);
    expect(message).toContain("selected tags");
  });
});
