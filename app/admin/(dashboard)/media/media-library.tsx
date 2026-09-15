"use client";

import { useRef, useState, useTransition } from "react";
import { MediaBrowser, type MediaBrowserAccept } from "@/components/admin/media/media-browser";
import { MediaPicker } from "@/components/admin/media-picker";
import { deleteMediaActionFn, replaceMediaAssetAction, type MediaAsset, type MediaUsage } from "@/lib/actions/media";
import { hasCapability } from "@/lib/auth/capabilities";
import type { AdminRole } from "@/lib/auth";
import { useConfirmDialog } from "@/components/admin/ui/confirm-dialog";
import { AsyncMessage } from "@/components/admin/ui/async-message";

/**
 * Standalone browse/upload/delete page — same MediaBrowser (grid/search/
 * pagination/upload/metadata-edit) the in-form MediaPicker dialog uses,
 * plus this page's own delete + "in use, replace everywhere" flow, which
 * only makes sense here (MediaPicker is for choosing an image for a
 * field, not for managing the library).
 */
const ASSET_TABS = ["image", "file"] as const;
const TAB_LABELS: Record<(typeof ASSET_TABS)[number], string> = { image: "Images", file: "Documents" };

export function MediaLibrary({ role }: { role: AdminRole }) {
  const canDelete = hasCapability(role, "delete_media");
  const [blocked, setBlocked] = useState<{ assetId: string; usages: MediaUsage[] } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isBusy, startBusy] = useTransition();
  const [accept, setAccept] = useState<MediaBrowserAccept>("image");
  const { confirm, dialog } = useConfirmDialog();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // ARIA "tabs" pattern (https://www.w3.org/WAI/ARIA/apg/patterns/tabs/):
  // arrow keys move both focus and the active tab between the two asset
  // types — a `role="tablist"` announces this as a real tab widget, so
  // sighted-mouse-only Left/Right arrow support isn't optional the way it
  // would be for a plain button group.
  function onTabKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const currentIndex = ASSET_TABS.indexOf(accept);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextTab = ASSET_TABS[(currentIndex + direction + ASSET_TABS.length) % ASSET_TABS.length];
    setAccept(nextTab);
    tabRefs.current[nextTab]?.focus();
  }

  async function attemptDelete(asset: MediaAsset, refresh: () => void) {
    const ok = await confirm({
      title: `Delete "${asset.title ?? asset.filename ?? asset.url}"?`,
      message: "This can't be undone.",
      tone: "danger",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setActionError(null);
    startBusy(async () => {
      const result = await deleteMediaActionFn(asset.id);
      if (result.status === "deleted") {
        setBlocked(null);
        refresh();
      } else if (result.status === "blocked") {
        setBlocked({ assetId: asset.id, usages: result.usages });
      } else {
        setActionError(result.message);
      }
    });
  }

  function replaceAndRetryDelete(oldAssetId: string, replacement: MediaAsset, refresh: () => void) {
    setActionError(null);
    startBusy(async () => {
      const replaceResult = await replaceMediaAssetAction(oldAssetId, replacement.id);
      if (replaceResult.status === "error") {
        setActionError(replaceResult.message);
        return;
      }
      // Every usage has been swapped to the replacement, so the asset is
      // no longer referenced anywhere — this retry should now succeed.
      const deleteResult = await deleteMediaActionFn(oldAssetId);
      if (deleteResult.status === "deleted") {
        setBlocked(null);
        refresh();
      } else if (deleteResult.status === "blocked") {
        setBlocked({ assetId: oldAssetId, usages: deleteResult.usages });
      } else {
        setActionError(deleteResult.message);
      }
    });
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-lg tracking-wide-display uppercase">Media library</h1>
      <AsyncMessage message={actionError ? { kind: "error", text: actionError } : null} />

      <div role="tablist" aria-label="Asset type" onKeyDown={onTabKeyDown} className="flex gap-2 text-xs uppercase tracking-wide-label">
        {ASSET_TABS.map((tab) => (
          <button
            key={tab}
            ref={(el) => {
              tabRefs.current[tab] = el;
            }}
            type="button"
            role="tab"
            id={`media-tab-${tab}`}
            aria-selected={accept === tab}
            aria-controls="media-tabpanel"
            tabIndex={accept === tab ? 0 : -1}
            onClick={() => setAccept(tab)}
            className={`rounded-full border px-4 py-1.5 ${
              accept === tab
                ? "border-osi-navy-900 bg-osi-navy-900 text-white"
                : "border-osi-sand-300 text-osi-navy-900 hover:border-osi-navy-900"
            }`}
          >
            {TAB_LABELS[tab]}
          </button>
        ))}
      </div>

      <div id="media-tabpanel" role="tabpanel" aria-labelledby={`media-tab-${accept}`} tabIndex={-1}>
        <MediaBrowser
          // Remounts on tab switch — MediaBrowser's pagination/folder/tag/
          // search state is internal and otherwise persists across an
          // `accept` change, producing a stale offset or filter from the
          // other tab (e.g. paging into Images then switching to Documents
          // re-fetches at the same non-zero offset).
          key={accept}
          accept={accept}
          renderCardFooter={(asset, { refresh }) => {
          if (!canDelete) return null;
          const isBlocked = blocked?.assetId === asset.id;
          return (
            <div className="space-y-2 border-t border-osi-sand-300 pt-2">
              <button
                type="button"
                onClick={() => attemptDelete(asset, refresh)}
                disabled={isBusy}
                className="text-[10px] uppercase tracking-wide-label text-red-600 hover:underline disabled:opacity-40"
              >
                Delete
              </button>
              {isBlocked && blocked && (
                <div
                  role="status"
                  aria-live="polite"
                  className="space-y-2 rounded border border-osi-gold-700 bg-osi-cream p-2 text-[11px] text-osi-navy-900"
                >
                  <p className="font-semibold">
                    In use — can&apos;t delete ({blocked.usages.length} reference{blocked.usages.length === 1 ? "" : "s"}):
                  </p>
                  <ul className="list-disc space-y-0.5 pl-4">
                    {blocked.usages.map((usage) => (
                      <li key={`${usage.source}-${usage.id}`}>
                        {usage.editHref ? (
                          <a href={usage.editHref} target="_blank" rel="noreferrer" className="underline">
                            {usage.label}
                          </a>
                        ) : (
                          usage.label
                        )}
                      </li>
                    ))}
                  </ul>
                  <p>Replace every use above with a different asset, then deletion will go through:</p>
                  <MediaPicker
                    label="replacement"
                    onChange={() => {}}
                    onSelectAsset={(replacement) => replaceAndRetryDelete(asset.id, replacement, refresh)}
                  />
                </div>
              )}
            </div>
          );
        }}
        />
      </div>
      {dialog}
    </div>
  );
}
