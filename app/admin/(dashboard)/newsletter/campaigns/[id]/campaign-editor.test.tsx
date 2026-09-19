import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const actions = vi.hoisted(() => ({
  getCampaignSendSummaryAction: vi.fn(),
  previewCampaignAction: vi.fn(),
  saveCampaignAction: vi.fn(),
  sendCampaignStepAction: vi.fn(),
  sendTestEmailAction: vi.fn(),
}));
const dialogs = vi.hoisted(() => ({ confirm: vi.fn(), prompt: vi.fn() }));
const refresh = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/newsletter-campaigns", () => actions);
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock("@/components/admin/ui/confirm-dialog", () => ({
  useConfirmDialog: () => ({ confirm: dialogs.confirm, prompt: dialogs.prompt, dialog: null }),
}));

import { CampaignEditor } from "@/app/admin/(dashboard)/newsletter/campaigns/[id]/campaign-editor";

afterEach(cleanup);

const palette = [
  {
    type: "heading",
    label: "Heading",
    description: "A section title.",
    adminFields: [
      { key: "text", label: "Text", type: "text" as const },
      { key: "size", label: "Size", type: "select" as const, options: ["large", "medium"] },
    ],
    defaults: { text: "", size: "large" },
  },
  { type: "divider", label: "Divider", description: "A thin line.", adminFields: [], defaults: {} },
];
const tags = [
  { id: "t1", name: "Distributors", created_at: "" },
  { id: "t2", name: "Operators", created_at: "" },
];
const ready = { canSendTest: true, canSendCampaign: true, missing: [] };

function editor(overrides: Partial<Parameters<typeof CampaignEditor>[0]> = {}) {
  return (
    <CampaignEditor
      campaign={{
        id: "c1",
        name: "September",
        subject: "News",
        preheader: "",
        tag_ids: [],
        blocks: [
          { type: "heading", data: { text: "Big news", size: "large" } },
          { type: "divider", data: {} },
        ],
        status: "draft",
        total_recipients: null,
      }}
      tags={tags}
      palette={palette}
      readiness={ready}
      initialStats={null}
      canSend
      {...overrides}
    />
  );
}

const done = (over = {}) => ({ pending: 0, sent: 2, failed: 0, skipped: 0, status: "sent", total: 2, done: true, ...over });

describe("CampaignEditor", () => {
  beforeEach(() => {
    for (const fn of Object.values({ ...actions, ...dialogs })) fn.mockReset();
    refresh.mockReset();
    actions.saveCampaignAction.mockResolvedValue({ status: "success" });
    dialogs.confirm.mockResolvedValue(true);
  });

  it("renders each block with its fields filled in", () => {
    render(editor());
    expect(screen.getByLabelText("Text")).toHaveValue("Big news");
    expect(screen.getByRole("heading", { name: "1. Heading" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2. Divider" })).toBeInTheDocument();
  });

  it("adds a block from the picker, starting from that block's defaults", () => {
    render(editor());
    fireEvent.change(screen.getByLabelText("Add a block"), { target: { value: "heading" } });
    fireEvent.click(screen.getByRole("button", { name: "Add block" }));
    expect(screen.getByRole("heading", { name: "3. Heading" })).toBeInTheDocument();
  });

  it("reorders and removes blocks", () => {
    render(editor());
    fireEvent.click(screen.getByRole("button", { name: "Move Heading down" }));
    expect(screen.getByRole("heading", { name: "1. Divider" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2. Heading" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]!);
    expect(screen.queryByRole("heading", { name: /Divider/ })).not.toBeInTheDocument();
  });

  it("saves the edited values", async () => {
    render(editor());
    fireEvent.change(screen.getByLabelText("Subject line"), { target: { value: "New subject" } });
    fireEvent.click(screen.getByLabelText("Operators"));
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(actions.saveCampaignAction).toHaveBeenCalled());
    expect(actions.saveCampaignAction).toHaveBeenCalledWith(
      "c1",
      expect.objectContaining({ subject: "New subject", tag_ids: ["t2"], blocks: [expect.objectContaining({ type: "heading" }), expect.objectContaining({ type: "divider" })] }),
    );
    expect(await screen.findByText("Draft saved.")).toBeInTheDocument();
  });

  it("shows a save error from the server", async () => {
    actions.saveCampaignAction.mockResolvedValue({ status: "error", message: "Heading (block 1) — text: required" });
    render(editor());
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));
    expect(await screen.findByText(/Heading \(block 1\)/)).toBeInTheDocument();
  });

  it("previews the unsaved state in a sandboxed iframe", async () => {
    actions.previewCampaignAction.mockResolvedValue({ status: "success", html: "<p>preview body</p>" });
    render(editor());
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));
    const frame = await screen.findByTitle("Email preview");
    expect(frame).toHaveAttribute("sandbox", "");
    expect(frame).toHaveAttribute("srcdoc", "<p>preview body</p>");
    fireEvent.click(screen.getByRole("button", { name: "Hide preview" }));
    expect(screen.queryByTitle("Email preview")).not.toBeInTheDocument();
  });

  it("hides Send from someone without the publish capability, but still allows tests", () => {
    render(editor({ canSend: false }));
    expect(screen.queryByRole("button", { name: /^Send…/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send test" })).toBeEnabled();
    expect(screen.getByText(/Sending to subscribers is for administrators/)).toBeInTheDocument();
  });

  it("disables test sending and says what is missing when email isn't configured", () => {
    render(editor({ readiness: { canSendTest: false, canSendCampaign: false, missing: ["RESEND_API_KEY"] } }));
    expect(screen.getByRole("button", { name: "Send test" })).toBeDisabled();
    expect(screen.getByText(/RESEND_API_KEY/)).toBeInTheDocument();
  });

  it("does not send when the confirmation is declined", async () => {
    actions.getCampaignSendSummaryAction.mockResolvedValue({ problem: null, audienceCount: 2, readiness: ready, canSend: true });
    dialogs.confirm.mockResolvedValue(false);
    render(editor());
    fireEvent.click(screen.getByRole("button", { name: /^Send…/ }));
    await waitFor(() => expect(dialogs.confirm).toHaveBeenCalled());
    expect(dialogs.confirm.mock.calls[0]![0].title).toBe("Send to 2 subscribers?");
    expect(actions.sendCampaignStepAction).not.toHaveBeenCalled();
  });

  it("saves first, refuses a draft the server says can't be sent, and never starts sending", async () => {
    actions.getCampaignSendSummaryAction.mockResolvedValue({ problem: "Add a subject line before sending.", audienceCount: 2, readiness: ready, canSend: true });
    render(editor());
    fireEvent.click(screen.getByRole("button", { name: /^Send…/ }));
    await waitFor(() => expect(dialogs.confirm).toHaveBeenCalled());
    expect(actions.saveCampaignAction).toHaveBeenCalled();
    expect(dialogs.confirm.mock.calls[0]![0]).toMatchObject({ title: "Can't send yet", message: "Add a subject line before sending." });
    expect(actions.sendCampaignStepAction).not.toHaveBeenCalled();
  });

  it("keeps stepping the send until the server reports it is done", async () => {
    actions.getCampaignSendSummaryAction.mockResolvedValue({ problem: null, audienceCount: 4, readiness: ready, canSend: true });
    actions.sendCampaignStepAction
      .mockResolvedValueOnce({ ok: true, progress: done({ sent: 2, pending: 2, total: 4, status: "sending", done: false }) })
      .mockResolvedValueOnce({ ok: true, progress: done({ sent: 4, total: 4 }) });
    render(editor());
    fireEvent.click(screen.getByRole("button", { name: /^Send…/ }));

    expect(await screen.findByText("Sent.")).toBeInTheDocument();
    expect(actions.sendCampaignStepAction).toHaveBeenCalledTimes(2);
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByText(/4 sent · 0 failed/)).toBeInTheDocument();
  });

  it("stops and shows the message when a step fails", async () => {
    actions.getCampaignSendSummaryAction.mockResolvedValue({ problem: null, audienceCount: 4, readiness: ready, canSend: true });
    actions.sendCampaignStepAction.mockResolvedValue({ ok: false, message: "Email isn't fully set up yet — missing: X." });
    render(editor());
    fireEvent.click(screen.getByRole("button", { name: /^Send…/ }));
    expect(await screen.findByText(/missing: X/)).toBeInTheDocument();
    expect(actions.sendCampaignStepAction).toHaveBeenCalledTimes(1);
  });

  it("locks a campaign that has been sent: no editing, no send buttons, results shown", () => {
    render(
      editor({
        campaign: { id: "c1", name: "September", subject: "News", preheader: "", tag_ids: [], blocks: [{ type: "heading", data: { text: "Big news", size: "large" } }], status: "sent", total_recipients: 3 },
        initialStats: { pending: 0, sent: 2, failed: 0, skipped: 1 },
      }),
    );
    expect(screen.getByLabelText("Subject line")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save draft" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Send…/ })).not.toBeInTheDocument();
    expect(screen.getByText(/2 sent · 0 failed · 1 skipped/)).toBeInTheDocument();
  });

  it("offers to resume a send that was interrupted", () => {
    render(
      editor({
        campaign: { id: "c1", name: "September", subject: "News", preheader: "", tag_ids: [], blocks: [], status: "sending", total_recipients: 4 },
        initialStats: { pending: 2, sent: 2, failed: 0, skipped: 0 },
      }),
    );
    expect(screen.getByRole("button", { name: "Resume sending" })).toBeInTheDocument();
  });
});
