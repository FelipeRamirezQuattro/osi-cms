"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminRole } from "@/lib/auth";
import { hasCapability } from "@/lib/auth/capabilities";
import {
  addSubscriberAction,
  createTagAction,
  deleteSubscriberAction,
  deleteTagAction,
  exportSubscribersCsvAction,
  setSubscriberTagsAction,
  type AddSubscriberResult,
  type NewsletterAdminResult,
} from "@/lib/actions/newsletter-subscribers";
import type { NewsletterSubscriberWithTags, NewsletterTag } from "@/lib/data/newsletter-subscribers";
import { filterBySearch, filterByStatus, paginate } from "@/lib/admin/list-query";
import { AdminPageHeader } from "@/components/admin/ui/admin-page-header";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/ui/admin-data-table";
import { AdminListControls } from "@/components/admin/ui/admin-list-controls";
import { useListQueryState } from "@/components/admin/ui/use-list-query-state";
import { StatusBadge } from "@/components/admin/ui/status-badge";
import { RowActionButton } from "@/components/admin/ui/row-actions";
import { Button } from "@/components/admin/ui/button";
import { Input } from "@/components/admin/ui/input";
import { useConfirmDialog } from "@/components/admin/ui/confirm-dialog";

const STATUSES = ["pending", "subscribed", "unsubscribed"];

/** Same day on server and client (toLocale* output can differ and cause a hydration mismatch). */
const day = (iso: string) => iso.slice(0, 10);

export function SubscribersAdmin({
  subscribers,
  tags,
  role,
}: {
  subscribers: NewsletterSubscriberWithTags[];
  tags: NewsletterTag[];
  role: AdminRole;
}) {
  const router = useRouter();
  const canDelete = hasCapability(role, "delete_content");
  const [isPending, startTransition] = useTransition();
  const { confirm, dialog } = useConfirmDialog();
  const query = useListQueryState();
  const [tagFilter, setTagFilter] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newSubscriberEmail, setNewSubscriberEmail] = useState("");
  const [newSubscriberTagIds, setNewSubscriberTagIds] = useState<string[]>([]);
  const [addNote, setAddNote] = useState<string | null>(null);

  const tagName = useMemo(() => new Map(tags.map((tag) => [tag.id, tag.name])), [tags]);
  const counts = useMemo(() => {
    const byStatus = { pending: 0, subscribed: 0, unsubscribed: 0 } as Record<string, number>;
    for (const subscriber of subscribers) byStatus[subscriber.status] = (byStatus[subscriber.status] ?? 0) + 1;
    return byStatus;
  }, [subscribers]);

  const filtered = useMemo(() => {
    let rows = filterBySearch(subscribers, query.q, (row) => row.email);
    rows = filterByStatus(rows, query.status, (row) => row.status);
    if (tagFilter) rows = rows.filter((row) => row.tag_ids.includes(tagFilter));
    return rows;
  }, [subscribers, query.q, query.status, tagFilter]);

  const { rows: pageRows, totalPages, page: currentPage } = paginate(filtered, query.page);

  async function report(result: NewsletterAdminResult, title: string) {
    if (result.status === "error") {
      await confirm({ title, message: result.message, hideCancel: true, confirmLabel: "OK" });
      return false;
    }
    router.refresh();
    return true;
  }

  function addTag() {
    const name = newTag.trim();
    if (!name) return;
    startTransition(async () => {
      if (await report(await createTagAction(name), "Can't add tag")) setNewTag("");
    });
  }

  function addSubscriber() {
    const email = newSubscriberEmail.trim();
    if (!email) return;
    setAddNote(null);
    startTransition(async () => {
      const result: AddSubscriberResult = await addSubscriberAction(email, newSubscriberTagIds);
      if (result.status === "error") {
        await confirm({ title: "Can't add subscriber", message: result.message, hideCancel: true, confirmLabel: "OK" });
        return;
      }
      setNewSubscriberEmail("");
      setNewSubscriberTagIds([]);
      setAddNote(result.alreadySubscribed ? "Already subscribed — tags updated." : "Added and marked subscribed.");
      router.refresh();
    });
  }

  async function removeTag(tag: NewsletterTag) {
    const ok = await confirm({
      title: `Delete the "${tag.name}" tag?`,
      message: "It is removed from every subscriber. The subscribers themselves are not deleted.",
      tone: "danger",
      confirmLabel: "Delete tag",
    });
    if (!ok) return;
    if (tagFilter === tag.id) setTagFilter("");
    startTransition(async () => {
      await report(await deleteTagAction(tag.id), "Can't delete tag");
    });
  }

  async function removeSubscriber(subscriber: NewsletterSubscriberWithTags) {
    const ok = await confirm({
      title: "Delete this subscriber?",
      message:
        "Use this for an erasure request. It also removes their unsubscribed record — someone who only wants no more email should use the unsubscribe link in a newsletter.",
      tone: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    startTransition(async () => {
      await report(await deleteSubscriberAction(subscriber.id), "Can't delete subscriber");
    });
  }

  const [isExporting, startExport] = useTransition();
  function exportCsv() {
    startExport(async () => {
      const csv = await exportSubscribersCsvAction();
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    });
  }

  const columns: AdminDataTableColumn<NewsletterSubscriberWithTags>[] = [
    { key: "email", header: "Email", render: (row) => <span className="font-medium break-all">{row.email}</span> },
    { key: "status", header: "Status", render: (row) => <StatusBadge label={row.status} /> },
    {
      key: "tags",
      header: "Tags",
      render: (row) => <TagEditor subscriber={row} tags={tags} tagName={tagName} disabled={isPending} onSave={(ids) => saveTags(row.id, ids)} />,
    },
    { key: "source", header: "Source", render: (row) => <span className="opacity-70">{row.page_slug ? `/${row.page_slug}` : row.source}</span> },
    { key: "joined", header: "Signed up", render: (row) => <span className="opacity-70">{day(row.created_at)}</span> },
    {
      key: "actions",
      header: "",
      cellClassName: "text-right",
      render: (row) =>
        canDelete ? (
          <RowActionButton onClick={() => removeSubscriber(row)} disabled={isPending} tone="danger">
            Delete
          </RowActionButton>
        ) : null,
    },
  ];

  async function saveTags(subscriberId: string, tagIds: string[]) {
    await new Promise<void>((resolve) => {
      startTransition(async () => {
        await report(await setSubscriberTagsAction(subscriberId, tagIds), "Can't save tags");
        resolve();
      });
    });
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Subscribers"
        subtitle={`${counts.subscribed} subscribed · ${counts.pending} pending confirmation · ${counts.unsubscribed} unsubscribed`}
        actions={
          <Button variant="secondary" onClick={exportCsv} disabled={isExporting}>
            {isExporting ? "Exporting…" : "Export CSV"}
          </Button>
        }
      />

      <section aria-labelledby="add-subscriber-heading" className="space-y-3 rounded border border-osi-sand-300 bg-osi-white p-4">
        <h2 id="add-subscriber-heading" className="text-sm font-medium">
          Add subscriber
        </h2>
        <p className="text-xs opacity-70">
          For someone who agreed to receive email off-site — in person, by phone, at a trade show. They&rsquo;re marked subscribed
          immediately; no confirmation email is sent. Visitors on the website should use the newsletter signup block instead.
        </p>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            addSubscriber();
          }}
        >
          <Input
            type="email"
            value={newSubscriberEmail}
            onChange={(event) => setNewSubscriberEmail(event.target.value)}
            placeholder="name@example.com"
            aria-label="New subscriber email"
            className="max-w-xs"
          />
          {tags.length > 0 && (
            <fieldset className="flex flex-wrap items-center gap-3">
              <legend className="sr-only">Tags</legend>
              {tags.map((tag) => (
                <label key={tag.id} className="flex items-center gap-1.5 text-xs">
                  <input
                    type="checkbox"
                    checked={newSubscriberTagIds.includes(tag.id)}
                    onChange={(event) =>
                      setNewSubscriberTagIds((prev) => (event.target.checked ? [...prev, tag.id] : prev.filter((id) => id !== tag.id)))
                    }
                  />
                  {tag.name}
                </label>
              ))}
            </fieldset>
          )}
          <Button type="submit" variant="secondary" disabled={isPending || !newSubscriberEmail.trim()}>
            Add subscriber
          </Button>
        </form>
        {addNote && (
          <p role="status" className="text-xs opacity-70">
            {addNote}
          </p>
        )}
      </section>

      <section aria-labelledby="newsletter-tags-heading" className="space-y-3 rounded border border-osi-sand-300 bg-osi-white p-4">
        <h2 id="newsletter-tags-heading" className="text-sm font-medium">
          Tags
        </h2>
        <p className="text-xs opacity-70">Tags group subscribers so a newsletter can be sent to just one group. Click a tag to filter the list.</p>
        <div className="flex flex-wrap items-center gap-2">
          {tags.length === 0 && <span className="text-sm opacity-60">No tags yet.</span>}
          {tags.map((tag) => (
            <span key={tag.id} className="inline-flex items-center gap-1 rounded border border-osi-sand-300 px-2 py-1 text-xs">
              <button
                type="button"
                aria-pressed={tagFilter === tag.id}
                onClick={() => setTagFilter(tagFilter === tag.id ? "" : tag.id)}
                className={tagFilter === tag.id ? "font-semibold underline" : "hover:underline"}
              >
                {tag.name}
              </button>
              <button type="button" aria-label={`Delete tag ${tag.name}`} onClick={() => removeTag(tag)} disabled={isPending} className="opacity-60 hover:opacity-100">
                ×
              </button>
            </span>
          ))}
        </div>
        <form
          className="flex max-w-md gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            addTag();
          }}
        >
          <Input value={newTag} onChange={(event) => setNewTag(event.target.value)} placeholder="New tag name" aria-label="New tag name" maxLength={60} />
          <Button type="submit" variant="secondary" disabled={isPending || !newTag.trim()}>
            Add tag
          </Button>
        </form>
      </section>

      <AdminDataTable
        columns={columns}
        rows={pageRows}
        getRowKey={(row) => row.id}
        emptyMessage={subscribers.length === 0 ? "No subscribers yet." : "No subscribers match these filters."}
        toolbar={
          <AdminListControls
            searchValue={query.q}
            onSearchChange={query.setQuery}
            searchPlaceholder="Search by email…"
            statusValue={query.status}
            onStatusChange={query.setStatus}
            statusOptions={STATUSES}
            page={currentPage}
            totalPages={totalPages}
            onPageChange={query.setPage}
            resultCount={filtered.length}
          />
        }
      />
      {dialog}
    </div>
  );
}

function TagEditor({
  subscriber,
  tags,
  tagName,
  disabled,
  onSave,
}: {
  subscriber: NewsletterSubscriberWithTags;
  tags: NewsletterTag[];
  tagName: Map<string, string>;
  disabled: boolean;
  onSave: (tagIds: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string[]>(subscriber.tag_ids);
  const names = subscriber.tag_ids.map((id) => tagName.get(id)).filter(Boolean);
  const dirty = selected.length !== subscriber.tag_ids.length || selected.some((id) => !subscriber.tag_ids.includes(id));

  return (
    <details className="text-xs">
      <summary className="cursor-pointer">{names.length > 0 ? names.join(", ") : <span className="opacity-60">Add tags</span>}</summary>
      <div className="mt-2 space-y-2 rounded border border-osi-sand-300 p-2">
        {tags.length === 0 ? (
          <p className="opacity-60">Create a tag above first.</p>
        ) : (
          tags.map((tag) => (
            <label key={tag.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected.includes(tag.id)}
                onChange={(event) => setSelected((prev) => (event.target.checked ? [...prev, tag.id] : prev.filter((id) => id !== tag.id)))}
              />
              {tag.name}
            </label>
          ))
        )}
        {tags.length > 0 && (
          <Button variant="secondary" disabled={disabled || !dirty} onClick={() => onSave(selected)}>
            Save tags
          </Button>
        )}
      </div>
    </details>
  );
}
