"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { createCampaignAction, deleteCampaignAction } from "@/lib/actions/newsletter-campaigns";
import type { NewsletterCampaignSummary } from "@/lib/data/newsletter-campaigns";
import type { NewsletterReadiness } from "@/lib/newsletter/readiness";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/ui/admin-data-table";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { RowActionButton } from "@/components/admin/ui/row-actions";
import { Button } from "@/components/admin/ui/button";
import { useConfirmDialog } from "@/components/admin/ui/confirm-dialog";

const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");

export function CampaignsList({
  campaigns,
  readiness,
  canDelete,
}: {
  campaigns: NewsletterCampaignSummary[];
  readiness: NewsletterReadiness;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { confirm, prompt, dialog } = useConfirmDialog();

  async function create() {
    const name = await prompt({
      title: "New campaign",
      label: "Name (only you see this)",
      placeholder: "e.g. September product update",
      confirmLabel: "Create",
      validate: (value) => (value.trim() ? null : "Give the campaign a name"),
    });
    if (!name) return;
    startTransition(async () => {
      const result = await createCampaignAction(name);
      if (result.status === "error") {
        await confirm({ title: "Can't create campaign", message: result.message, hideCancel: true, confirmLabel: "OK" });
        return;
      }
      router.push(`/admin/newsletter/campaigns/${result.id}`);
    });
  }

  async function remove(campaign: NewsletterCampaignSummary) {
    const ok = await confirm({ title: `Delete "${campaign.name}"?`, message: "This draft is removed permanently.", tone: "danger", confirmLabel: "Delete" });
    if (!ok) return;
    startTransition(async () => {
      const result = await deleteCampaignAction(campaign.id);
      if (result.status === "error") {
        await confirm({ title: "Can't delete", message: result.message, hideCancel: true, confirmLabel: "OK" });
        return;
      }
      router.refresh();
    });
  }

  const columns: AdminDataTableColumn<NewsletterCampaignSummary>[] = [
    {
      key: "name",
      header: "Campaign",
      render: (row) => (
        <Link href={`/admin/newsletter/campaigns/${row.id}`} className="font-medium hover:underline">
          {row.name}
        </Link>
      ),
    },
    { key: "subject", header: "Subject", render: (row) => <span className="opacity-70">{row.subject || "—"}</span> },
    { key: "status", header: "Status", render: (row) => <StatusBadge label={row.status} /> },
    { key: "recipients", header: "Recipients", render: (row) => <span className="opacity-70">{row.total_recipients ?? "—"}</span> },
    { key: "date", header: "Sent", render: (row) => <span className="opacity-70">{day(row.sent_at)}</span> },
    {
      key: "actions",
      header: "",
      cellClassName: "text-right",
      render: (row) =>
        canDelete && row.status === "draft" ? (
          <RowActionButton onClick={() => remove(row)} disabled={isPending} tone="danger">
            Delete
          </RowActionButton>
        ) : null,
    },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Campaigns"
        subtitle="Newsletters you write here are sent to confirmed subscribers."
        actions={
          <Button onClick={create} disabled={isPending}>
            New campaign
          </Button>
        }
      />
      {!readiness.canSendCampaign && (
        <p role="status" className="rounded border border-osi-gold-500/50 bg-osi-gold-500/10 px-4 py-3 text-sm">
          Email isn&rsquo;t fully set up yet, so campaigns can be written but not sent. Still to configure: {readiness.missing.join(", ")}.
        </p>
      )}
      <AdminDataTable columns={columns} rows={campaigns} getRowKey={(row) => row.id} emptyMessage="No campaigns yet." />
      {dialog}
    </div>
  );
}
