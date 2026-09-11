"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { listMediaAction, uploadMediaAction, type UploadMediaState } from "@/lib/actions/media";
import type { MediaAsset } from "@/lib/data/media";
import { resolveMediaUrl } from "@/lib/media";

const initialUploadState: UploadMediaState = { status: "idle" };

// Same useSyncExternalStore-for-"is this the client" trick as
// recommendations-client.tsx (see CLAUDE.md) — avoids the
// react-hooks/set-state-in-effect lint error a useEffect+setState mount
// flag would trigger, and matches SSR/first-paint so there's no flash.
function subscribeNoop() {
  return () => {};
}
function getClientSnapshot() {
  return true;
}
function getServerSnapshot() {
  return false;
}

export function MediaPicker({
  value,
  onChange,
  label = "Image",
}: {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, startLoading] = useTransition();
  const [uploadState, uploadFormAction] = useActionState(uploadMediaAction, initialUploadState);
  // The dialog (and its own upload <form>) is portaled to document.body —
  // every caller of MediaPicker renders it inside its own <form>, and
  // HTML forbids a nested <form>. Portaling avoids that regardless of
  // where MediaPicker itself sits in the tree. Only after mount, since
  // document.body doesn't exist during SSR.
  const mounted = useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);

  function refresh(q?: string) {
    startLoading(async () => {
      const data = await listMediaAction(q);
      setAssets(data);
    });
  }

  function open() {
    dialogRef.current?.showModal();
    refresh(search);
  }

  function close() {
    dialogRef.current?.close();
  }

  function select(url: string) {
    onChange(url);
    close();
  }

  useEffect(() => {
    if (uploadState.status === "success" && uploadState.asset) {
      select(uploadState.asset.url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uploadState]);

  return (
    <div className="flex items-center gap-3">
      {value ? (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded border border-osi-sand-300">
          <Image src={resolveMediaUrl(value)} alt="" fill className="object-cover" />
        </div>
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-dashed border-osi-sand-300 text-[10px] text-osi-slate-400">
          None
        </div>
      )}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={open}
          className="rounded border border-osi-navy-900 px-3 py-1 text-xs uppercase tracking-wide-label"
        >
          {value ? `Change ${label}` : `Choose ${label}`}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-left text-xs text-osi-slate-400 hover:underline"
          >
            Remove
          </button>
        )}
      </div>

      {mounted &&
        createPortal(
          <dialog
            ref={dialogRef}
            className="w-[90vw] max-w-3xl rounded-lg border border-osi-sand-300 bg-osi-white p-0 backdrop:bg-osi-navy-900/60"
          >
            <div className="flex items-center justify-between border-b border-osi-sand-300 px-5 py-3">
              <h2 className="font-display text-sm tracking-wide-display uppercase">Media library</h2>
              <button type="button" onClick={close} className="text-sm opacity-60 hover:opacity-100">
                Close
              </button>
            </div>

            <div className="space-y-4 p-5">
              <form action={uploadFormAction} className="flex items-center gap-3">
                <input type="file" name="file" accept="image/*" required className="text-xs" />
                <button
                  type="submit"
                  className="rounded bg-osi-navy-900 px-3 py-1 text-xs uppercase tracking-wide-label text-osi-white"
                >
                  Upload
                </button>
                {uploadState.status === "error" && (
                  <span className="text-xs text-red-600">{uploadState.message}</span>
                )}
              </form>

              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  refresh(e.target.value);
                }}
                placeholder="Search by title, alt text, or URL…"
                className="w-full rounded border border-osi-sand-300 px-3 py-2 text-sm"
              />

              <div className="grid max-h-96 grid-cols-4 gap-3 overflow-y-auto sm:grid-cols-6">
                {isLoading && <p className="col-span-full text-xs text-osi-slate-400">Loading…</p>}
                {!isLoading && assets.length === 0 && (
                  <p className="col-span-full text-xs text-osi-slate-400">No media found.</p>
                )}
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => select(asset.url)}
                    className="relative aspect-square overflow-hidden rounded border border-osi-sand-300 hover:ring-2 hover:ring-osi-gold-500"
                    title={asset.title ?? asset.url}
                  >
                    <Image src={resolveMediaUrl(asset.url)} alt={asset.alt ?? ""} fill className="object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </dialog>,
          document.body,
        )}
    </div>
  );
}
