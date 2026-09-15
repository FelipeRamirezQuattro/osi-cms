"use client";

import { useState, useTransition } from "react";
import { MediaBrowser } from "@/components/admin/media/media-browser";
import { MediaPicker } from "@/components/admin/media-picker";
import { deleteMediaActionFn, replaceMediaAssetAction, type MediaAsset, type MediaUsage } from "@/lib/actions/media";
import { hasCapability } from "@/lib/auth/capabilities";
import type { AdminRole } from "@/lib/auth";

/**
 * Standalone browse/upload/delete page — same MediaBrowser (grid/search/
 * pagination/upload/metadata-edit) the in-form MediaPicker dialog uses,
 * plus this page's own delete + "in use, replace everywhere" flow, which
 * only makes sense here (MediaPicker is for choosing an image for a
 * field, not for managing the library).
 */
export function MediaLibrary({ role }: { role: AdminRole }) {
  const canDelete = hasCapability(role, "delete_media");
  const [blocked, setBlocked] = useState<{ assetId: string; usages: MediaUsage[] } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isBusy, startBusy] = useTransition();

  function attemptDelete(asset: MediaAsset, refresh: () => void) {
    if (!window.confirm(`Delete "${asset.title ?? asset.filename ?? asset.url}"? This can't be undone.`)) return;
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
      {actionError && <p className="rounded border border-red-300 bg-red-50 p-2 text-xs text-red-700">{actionError}</p>}

      <MediaBrowser
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
                <div className="space-y-2 rounded border border-osi-gold-700 bg-osi-cream p-2 text-[11px] text-osi-navy-900">
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
  );
}
