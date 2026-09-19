import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ requireCapability: vi.fn() }));
const d = vi.hoisted(() => ({
  createCampaign: vi.fn(),
  deleteDraftCampaign: vi.fn(),
  getCampaign: vi.fn(),
  listCampaigns: vi.fn(),
  countAudience: vi.fn(),
  updateCampaignDraft: vi.fn(),
}));
const sendCampaignTest = vi.hoisted(() => vi.fn());
const sendCampaignStep = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => auth);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/data/newsletter-campaigns", () => d);
vi.mock("@/lib/email", async (importActual) => ({ ...(await importActual<typeof import("@/lib/email")>()), sendCampaignTest }));
vi.mock("@/lib/newsletter/send-campaign", async (importActual) => ({
  ...(await importActual<typeof import("@/lib/newsletter/send-campaign")>()),
  sendCampaignStep,
}));

import {
  deleteCampaignAction,
  getCampaignSendSummaryAction,
  previewCampaignAction,
  saveCampaignAction,
  sendCampaignStepAction,
  sendTestEmailAction,
} from "@/lib/actions/newsletter-campaigns";

const ENV = { RESEND_API_KEY: "k", RESEND_FROM_EMAIL: "News <n@example.com>", NEWSLETTER_TOKEN_SECRET: "s", NEWSLETTER_MAILING_ADDRESS: "1 Main St" };
const saved: Record<string, string | undefined> = {};
const TAG = "3f1c2b4a-5d6e-4f70-8a91-b2c3d4e5f607";
const input = (over: Record<string, unknown> = {}) => ({
  name: "Sept",
  subject: "Hello",
  preheader: "",
  tag_ids: [],
  blocks: [{ type: "heading", data: { text: "Hi" } }],
  ...over,
});

describe("newsletter campaign actions", () => {
  beforeEach(() => {
    for (const [k, v] of Object.entries(ENV)) {
      saved[k] = process.env[k];
      process.env[k] = v;
    }
    auth.requireCapability.mockReset().mockResolvedValue({ email: "editor@example.com", role: "editor" });
    for (const fn of Object.values(d)) fn.mockReset();
    sendCampaignTest.mockReset().mockResolvedValue({ ok: true });
    sendCampaignStep.mockReset();
    d.updateCampaignDraft.mockResolvedValue({ id: "c1" });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  describe("saveCampaignAction", () => {
    it("saves parsed blocks with schema defaults filled in", async () => {
      expect(await saveCampaignAction("c1", input({ tag_ids: [TAG] }))).toEqual({ status: "success" });
      expect(d.updateCampaignDraft).toHaveBeenCalledWith("c1", {
        name: "Sept",
        subject: "Hello",
        preheader: "",
        tag_ids: [TAG],
        blocks: [{ type: "heading", data: { text: "Hi", size: "large", align: "left" } }],
      });
    });

    it("rejects an invalid block without writing, naming the block", async () => {
      const result = await saveCampaignAction("c1", input({ blocks: [{ type: "button", data: { label: "Go", href: "javascript:alert(1)" } }] }));
      expect(result).toMatchObject({ status: "error", message: expect.stringContaining("Button") });
      expect(d.updateCampaignDraft).not.toHaveBeenCalled();
    });

    it("rejects bad campaign fields (name, tag ids)", async () => {
      expect((await saveCampaignAction("c1", input({ name: "  " }))).status).toBe("error");
      expect((await saveCampaignAction("c1", input({ tag_ids: ["not-a-uuid"] }))).status).toBe("error");
      expect(d.updateCampaignDraft).not.toHaveBeenCalled();
    });

    it("refuses to edit a campaign that is no longer a draft", async () => {
      d.updateCampaignDraft.mockResolvedValue(null);
      expect(await saveCampaignAction("c1", input())).toEqual({ status: "error", message: expect.stringContaining("already been sent") });
    });
  });

  describe("previewCampaignAction", () => {
    it("renders the email with the unsubscribe placeholder replaced", async () => {
      const result = await previewCampaignAction(input());
      expect(result).toMatchObject({ status: "success" });
      if (result.status === "success") {
        expect(result.html).toContain("Hi");
        expect(result.html).not.toContain("%%UNSUBSCRIBE_URL%%");
      }
    });

    it("reports invalid content instead of rendering", async () => {
      expect((await previewCampaignAction(input({ blocks: [{ type: "nope", data: {} }] }))).status).toBe("error");
    });
  });

  describe("sendTestEmailAction", () => {
    it("sends to the signed-in editor by default, marked [Test], with no real unsubscribe token", async () => {
      expect(await sendTestEmailAction(input())).toEqual({ status: "success" });
      const sent = sendCampaignTest.mock.calls[0]![0] as { to: string; subject: string; html: string };
      expect(sent.to).toBe("editor@example.com");
      expect(sent.subject).toBe("[Test] Hello");
      expect(sent.html).not.toMatch(/token=/);
    });

    it("can send to another address, and rejects a malformed one", async () => {
      await sendTestEmailAction(input(), "boss@example.com");
      expect((sendCampaignTest.mock.calls[0]![0] as { to: string }).to).toBe("boss@example.com");
      expect((await sendTestEmailAction(input(), "nope")).status).toBe("error");
    });

    it("needs only a working sender — not the token secret or mailing address", async () => {
      delete process.env.NEWSLETTER_TOKEN_SECRET;
      delete process.env.NEWSLETTER_MAILING_ADDRESS;
      expect(await sendTestEmailAction(input())).toEqual({ status: "success" });
    });

    it("explains when email isn't configured, and doesn't attempt a send", async () => {
      delete process.env.RESEND_API_KEY;
      const result = await sendTestEmailAction(input());
      expect(result).toEqual({ status: "error", message: expect.stringContaining("RESEND_API_KEY") });
      expect(sendCampaignTest).not.toHaveBeenCalled();
    });

    it("surfaces a provider rejection", async () => {
      sendCampaignTest.mockResolvedValue({ ok: false, message: "Domain not verified" });
      expect(await sendTestEmailAction(input())).toEqual({ status: "error", message: "Domain not verified" });
    });
  });

  describe("sending the real campaign", () => {
    it("requires the publish capability (admin), not just newsletter access", async () => {
      sendCampaignStep.mockResolvedValue({ ok: true, progress: { done: true } });
      await sendCampaignStepAction("c1");
      expect(auth.requireCapability).toHaveBeenCalledWith("publish");
    });

    it("turns an unexpected failure into a safe-to-retry message without leaking details", async () => {
      sendCampaignStep.mockRejectedValue(new Error("connection string postgres://secret"));
      const result = await sendCampaignStepAction("c1");
      expect(result).toEqual({ ok: false, message: expect.stringContaining("safe to try again") });
      expect(JSON.stringify(result)).not.toContain("postgres");
    });

    it("tells the UI whether this user may send at all", async () => {
      d.getCampaign.mockResolvedValue({ id: "c1", status: "draft", tag_ids: [], subject: "S", blocks: [{ type: "heading", data: { text: "Hi" } }] });
      d.countAudience.mockResolvedValue(3);
      expect(await getCampaignSendSummaryAction("c1")).toMatchObject({ canSend: false, audienceCount: 3, problem: null });
      auth.requireCapability.mockResolvedValue({ email: "a@example.com", role: "admin" });
      expect(await getCampaignSendSummaryAction("c1")).toMatchObject({ canSend: true });
    });
  });

  describe("deleteCampaignAction", () => {
    it("is admin-only and only deletes drafts", async () => {
      d.deleteDraftCampaign.mockResolvedValue(false);
      const result = await deleteCampaignAction("c1");
      expect(auth.requireCapability).toHaveBeenCalledWith("delete_content");
      expect(result).toMatchObject({ status: "error" });
    });
  });
});
