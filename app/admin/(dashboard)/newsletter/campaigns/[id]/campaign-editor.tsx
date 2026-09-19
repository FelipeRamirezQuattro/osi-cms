"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, FormProvider, useFieldArray, useForm } from "react-hook-form";
import {
  getCampaignSendSummaryAction,
  previewCampaignAction,
  saveCampaignAction,
  sendCampaignStepAction,
  sendTestEmailAction,
} from "@/lib/actions/newsletter-campaigns";
import type { CampaignStats } from "@/lib/data/newsletter-campaigns";
import type { NewsletterTag } from "@/lib/data/newsletter-subscribers";
import type { EmailBlockPaletteEntry } from "@/lib/email-blocks/registry";
import type { NewsletterReadiness } from "@/lib/newsletter/readiness";
import type { CampaignProgress } from "@/lib/newsletter/send-campaign";
import { FieldRenderer } from "@/components/admin/field-renderer";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { Button } from "@/components/admin/ui/button";
import { FormField } from "@/components/admin/ui/form-field";
import { Input } from "@/components/admin/ui/input";
import { Select } from "@/components/admin/ui/select";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { ReorderButtons, RowActionButton } from "@/components/admin/ui/row-actions";
import { useConfirmDialog } from "@/components/admin/ui/confirm-dialog";

type FormValues = {
  name: string;
  subject: string;
  preheader: string;
  tag_ids: string[];
  blocks: { type: string; data: Record<string, unknown> }[];
};

type Notice = { tone: "success" | "error"; text: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function CampaignEditor({
  campaign,
  tags,
  palette,
  readiness,
  initialStats,
  canSend,
}: {
  campaign: FormValues & { id: string; status: string; total_recipients: number | null };
  tags: NewsletterTag[];
  palette: EmailBlockPaletteEntry[];
  readiness: NewsletterReadiness;
  initialStats: CampaignStats | null;
  canSend: boolean;
}) {
  const router = useRouter();
  const locked = campaign.status !== "draft";
  const { confirm, prompt, dialog } = useConfirmDialog();

  const form = useForm<FormValues>({
    defaultValues: {
      name: campaign.name,
      subject: campaign.subject,
      preheader: campaign.preheader,
      tag_ids: campaign.tag_ids,
      blocks: campaign.blocks,
    },
  });
  const { fields, append, remove, move } = useFieldArray({ control: form.control, name: "blocks" });

  const entries = useMemo(() => new Map(palette.map((entry) => [entry.type, entry])), [palette]);
  const [newType, setNewType] = useState(palette[0]?.type ?? "");
  const [busy, setBusy] = useState<null | "save" | "preview" | "test" | "send">(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [progress, setProgress] = useState<CampaignProgress | null>(
    initialStats
      ? {
          ...initialStats,
          status: campaign.status as CampaignProgress["status"],
          total: campaign.total_recipients ?? 0,
          done: campaign.status !== "sending",
        }
      : null,
  );

  const disabled = locked || busy !== null;

  async function saveNow(): Promise<boolean> {
    setBusy("save");
    try {
      const values = form.getValues();
      const result = await saveCampaignAction(campaign.id, values);
      if (result.status === "error") {
        setNotice({ tone: "error", text: result.message });
        return false;
      }
      form.reset(values);
      setNotice({ tone: "success", text: "Draft saved." });
      return true;
    } finally {
      setBusy(null);
    }
  }

  async function togglePreview() {
    if (previewHtml !== null) {
      setPreviewHtml(null);
      return;
    }
    setBusy("preview");
    try {
      const result = await previewCampaignAction(form.getValues());
      if (result.status === "error") setNotice({ tone: "error", text: result.message });
      else setPreviewHtml(result.html);
    } finally {
      setBusy(null);
    }
  }

  async function sendTest() {
    const to = await prompt({
      title: "Send a test email",
      message: "You'll get exactly what subscribers would, marked [Test]. Nothing is sent to your list.",
      label: "Send to (leave blank to send to yourself)",
      confirmLabel: "Send test",
      validate: (value) => (value.trim() === "" || /^\S+@\S+\.\S+$/.test(value.trim()) ? null : "Enter a valid email address"),
    });
    if (to === null) return;
    setBusy("test");
    try {
      const result = await sendTestEmailAction(form.getValues(), to);
      setNotice(result.status === "success" ? { tone: "success", text: "Test email sent — check your inbox." } : { tone: "error", text: result.message });
    } finally {
      setBusy(null);
    }
  }

  /** Drives the send in repeated server steps until done; safe to interrupt and resume. */
  async function runSend() {
    setBusy("send");
    setNotice(null);
    let lastProcessed = -1;
    let stalls = 0;
    try {
      for (;;) {
        const result = await sendCampaignStepAction(campaign.id);
        if (!result.ok) {
          setNotice({ tone: "error", text: result.message });
          return;
        }
        setProgress(result.progress);
        if (result.progress.done) {
          setNotice({
            tone: result.progress.status === "sent" ? "success" : "error",
            text: result.progress.status === "sent" ? "Sent." : "Nothing could be delivered — see the failures below.",
          });
          router.refresh();
          return;
        }
        // Give up if several passes in a row make no headway, rather than looping forever.
        const processed = result.progress.sent + result.progress.failed + result.progress.skipped;
        stalls = processed === lastProcessed ? stalls + 1 : 0;
        lastProcessed = processed;
        if (stalls >= 3) {
          setNotice({ tone: "error", text: result.progress.retryMessage ?? "Sending has stalled. Press “Resume sending” to try again." });
          return;
        }
        if (result.progress.retryMessage) await sleep(3000);
      }
    } finally {
      setBusy(null);
    }
  }

  async function send() {
    if (!(await saveNow())) return;
    const summary = await getCampaignSendSummaryAction(campaign.id);
    if (!summary) return;
    const problem = summary.problem ?? (summary.readiness.canSendCampaign ? null : `Email isn't fully set up — missing: ${summary.readiness.missing.join(", ")}.`);
    if (problem) {
      await confirm({ title: "Can't send yet", message: problem, hideCancel: true, confirmLabel: "OK" });
      return;
    }
    const ok = await confirm({
      title: `Send to ${summary.audienceCount} subscriber${summary.audienceCount === 1 ? "" : "s"}?`,
      message: "Emails go out right away and this can't be undone.",
      consequences: [
        `Recipients: ${form.getValues("tag_ids").length > 0 ? "subscribed people with the selected tags" : "everyone who is subscribed"}.`,
        "Keep this page open until it finishes. If you lose the connection, come back and press Resume sending.",
      ],
      confirmLabel: "Send now",
    });
    if (ok) await runSend();
  }

  const processed = progress ? progress.sent + progress.failed + progress.skipped : 0;
  const percent = progress && progress.total > 0 ? Math.round((processed / progress.total) * 100) : 0;

  return (
    <FormProvider {...form}>
      <div className="space-y-6">
        <AdminPageHeader
          title={campaign.name}
          subtitle={<StatusBadge label={campaign.status} />}
          backHref="/admin/newsletter/campaigns"
          backLabel="Campaigns"
          actions={
            !locked ? (
              <span className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={togglePreview} disabled={busy !== null}>
                  {previewHtml !== null ? "Hide preview" : busy === "preview" ? "Rendering…" : "Preview"}
                </Button>
                <Button variant="secondary" onClick={sendTest} disabled={busy !== null || !readiness.canSendTest}>
                  Send test
                </Button>
                <Button variant="secondary" onClick={() => void saveNow()} disabled={busy !== null}>
                  {busy === "save" ? "Saving…" : "Save draft"}
                </Button>
                {canSend && (
                  <Button onClick={send} disabled={busy !== null}>
                    Send…
                  </Button>
                )}
              </span>
            ) : null
          }
        />

        {notice && (
          <p role="status" className={notice.tone === "error" ? "rounded border border-[var(--admin-danger)] px-4 py-3 text-sm" : "rounded border border-osi-sand-300 bg-osi-white px-4 py-3 text-sm"}>
            {notice.text}
          </p>
        )}

        {!locked && !readiness.canSendTest && (
          <p role="status" className="rounded border border-osi-gold-500/50 bg-osi-gold-500/10 px-4 py-3 text-sm">
            Email isn&rsquo;t set up yet, so test emails can&rsquo;t be sent. Still to configure: {readiness.missing.join(", ")}.
          </p>
        )}
        {!locked && readiness.canSendTest && !readiness.canSendCampaign && (
          <p role="status" className="rounded border border-osi-gold-500/50 bg-osi-gold-500/10 px-4 py-3 text-sm">
            Test emails work, but sending to subscribers also needs: {readiness.missing.join(", ")}.
          </p>
        )}
        {!locked && !canSend && (
          <p className="text-xs opacity-70">You can write, preview and send yourself tests. Sending to subscribers is for administrators.</p>
        )}

        {progress && (
          <section aria-labelledby="send-progress" className="space-y-3 rounded border border-osi-sand-300 bg-osi-white p-4">
            <h2 id="send-progress" className="text-sm font-medium">
              {progress.status === "sending" ? "Sending" : progress.status === "sent" ? "Sent" : "Failed"}
            </h2>
            <div
              role="progressbar"
              aria-label="Send progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="h-2 overflow-hidden rounded bg-osi-sand-300"
            >
              <div className="h-full bg-osi-navy-900 transition-[width] duration-300" style={{ width: `${percent}%` }} />
            </div>
            <p className="text-sm">
              {progress.sent} sent · {progress.failed} failed · {progress.skipped} skipped (unsubscribed since) · {progress.pending} waiting — of {progress.total}
            </p>
            {progress.retryMessage && <p className="text-xs opacity-70">Waiting to retry: {progress.retryMessage}</p>}
            {campaign.status === "sending" && busy !== "send" && canSend && (
              <Button onClick={runSend}>Resume sending</Button>
            )}
            {busy === "send" && <p className="text-xs opacity-70">Keep this page open until sending finishes.</p>}
          </section>
        )}

        <fieldset disabled={disabled} className="space-y-6 disabled:opacity-80">
          <section className="space-y-4 rounded border border-osi-sand-300 bg-osi-white p-4">
            <FormField label="Campaign name" htmlFor="campaign-name" help="Only you see this.">
              <Input id="campaign-name" {...form.register("name")} maxLength={120} />
            </FormField>
            <FormField label="Subject line" htmlFor="campaign-subject" help="What people see in their inbox.">
              <Input id="campaign-subject" {...form.register("subject")} maxLength={200} />
            </FormField>
            <FormField label="Preview text" htmlFor="campaign-preheader" help="The grey snippet after the subject in most inboxes (optional).">
              <Input id="campaign-preheader" {...form.register("preheader")} maxLength={200} />
            </FormField>
          </section>

          <section aria-labelledby="audience-heading" className="space-y-2 rounded border border-osi-sand-300 bg-osi-white p-4">
            <h2 id="audience-heading" className="text-sm font-medium">
              Audience
            </h2>
            <p className="text-xs opacity-70">Leave every tag unticked to send to everyone who is subscribed, or tick tags to reach only people with any of them.</p>
            {tags.length === 0 ? (
              <p className="text-sm opacity-60">
                No tags yet — <Link href="/admin/newsletter/subscribers" className="underline">create some under Subscribers</Link>.
              </p>
            ) : (
              <Controller
                control={form.control}
                name="tag_ids"
                render={({ field }) => (
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {tags.map((tag) => (
                      <label key={tag.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={field.value.includes(tag.id)}
                          onChange={(event) => field.onChange(event.target.checked ? [...field.value, tag.id] : field.value.filter((id) => id !== tag.id))}
                        />
                        {tag.name}
                      </label>
                    ))}
                  </div>
                )}
              />
            )}
          </section>

          <section aria-labelledby="content-heading" className="space-y-4">
            <h2 id="content-heading" className="text-sm font-medium">
              Content
            </h2>
            <p className="text-xs opacity-70">The header, unsubscribe link and mailing address are added automatically to every email.</p>

            <ol className="space-y-4">
              {fields.map((field, index) => {
                const entry = entries.get(field.type);
                return (
                  <li key={field.id} className="space-y-3 rounded border border-osi-sand-300 bg-osi-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-medium">
                        {index + 1}. {entry?.label ?? field.type}
                      </h3>
                      <span className="flex items-center gap-3">
                        <ReorderButtons
                          onMoveUp={() => move(index, index - 1)}
                          onMoveDown={() => move(index, index + 1)}
                          disableUp={index === 0}
                          disableDown={index === fields.length - 1}
                          itemLabel={entry?.label}
                        />
                        <RowActionButton onClick={() => remove(index)} tone="danger">
                          Remove
                        </RowActionButton>
                      </span>
                    </div>
                    {entry ? (
                      entry.adminFields.length > 0 ? (
                        entry.adminFields.map((spec) => <FieldRenderer key={spec.key} spec={spec} name={`blocks.${index}.data.${spec.key}`} />)
                      ) : (
                        <p className="text-xs opacity-60">Nothing to configure.</p>
                      )
                    ) : (
                      <p className="text-xs">This block type no longer exists and will be left out of the email. Remove it.</p>
                    )}
                  </li>
                );
              })}
            </ol>
            {fields.length === 0 && <p className="text-sm opacity-60">No content yet. Add your first block below.</p>}

            <div className="flex flex-wrap items-end gap-2">
              <FormField label="Add a block" htmlFor="new-block-type" help={entries.get(newType)?.description}>
                <Select id="new-block-type" value={newType} onChange={(event) => setNewType(event.target.value)}>
                  {palette.map((entry) => (
                    <option key={entry.type} value={entry.type}>
                      {entry.label}
                    </option>
                  ))}
                </Select>
              </FormField>
              <Button
                variant="secondary"
                onClick={() => {
                  const entry = entries.get(newType);
                  if (entry) append({ type: entry.type, data: structuredClone(entry.defaults) });
                }}
              >
                Add block
              </Button>
            </div>
          </section>
        </fieldset>

        {previewHtml !== null && (
          <section aria-labelledby="preview-heading" className="space-y-2">
            <h2 id="preview-heading" className="text-sm font-medium">
              Preview
            </h2>
            {/* sandbox="" — no scripts, no navigation: the preview is inert HTML. */}
            <iframe title="Email preview" sandbox="" srcDoc={previewHtml} className="h-[720px] w-full rounded border border-osi-sand-300 bg-white" />
          </section>
        )}
      </div>
      {dialog}
    </FormProvider>
  );
}
