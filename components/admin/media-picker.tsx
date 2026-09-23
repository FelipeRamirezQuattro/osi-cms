"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { MediaBrowser, type MediaBrowserAccept } from "@/components/admin/media/media-browser";
import type { MediaAsset } from "@/lib/actions/media";
import { resolveMediaUrl } from "@/lib/media";

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
  accept = "image",
  onSelectAsset,
}: {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  /** Restricts the picker to images (default) or documents (currently PDF only) — see lib/validation/media.ts. */
  accept?: MediaBrowserAccept;
  /**
   * Optional companion to onChange: also hands back the full selected
   * asset (id included) — used by the replace-everywhere flow
   * (media-library.tsx) to know *which* asset was chosen, not just its
   * URL. Every existing image-field caller only passes onChange, which
   * keeps working unchanged (Task 11 controller ruling #1: a new
   * selection MAY carry an asset id without forcing every existing
   * consumer field to change shape).
   */
  onSelectAsset?: (asset: MediaAsset) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  // The dialog (and everything MediaBrowser renders inside it, including
  // its own upload <form>) is portaled to document.body — every caller
  // of MediaPicker renders it inside its own <form>, and HTML forbids a
  // nested <form>. Portaling avoids that regardless of where MediaPicker
  // itself sits in the tree. Only after mount, since document.body
  // doesn't exist during SSR.
  const mounted = useSyncExternalStore(subscribeNoop, getClientSnapshot, getServerSnapshot);
  // MediaBrowser fires its list/folders/tags server actions on mount, so
  // it must not render until the dialog is actually opened — the portal
  // above mounts unconditionally as soon as the picker itself mounts,
  // which previously made every MediaPicker on a page (a product editor
  // has 7+) fire those calls on every page load. isOpen tracks it
  // independently of the <dialog>'s own open state so MediaBrowser can be
  // conditionally rendered inside.
  const [isOpen, setIsOpen] = useState(false);

  function open() {
    dialogRef.current?.showModal();
    setIsOpen(true);
  }

  function close() {
    dialogRef.current?.close();
    setIsOpen(false);
  }

  function select(asset: MediaAsset) {
    onChange(asset.url);
    onSelectAsset?.(asset);
    close();
  }

  return (
    <div className="flex items-center gap-3">
      {value ? (
        accept === "model" ? (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-osi-sand-300 bg-osi-sand-100 text-[10px] font-display uppercase tracking-wide-label text-osi-slate-500">
            3D
          </div>
        ) : (
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded border border-osi-sand-300">
            <Image src={resolveMediaUrl(value)} alt="" fill className="object-cover" />
          </div>
        )
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-dashed border-osi-sand-300 text-[10px] text-osi-slate-400">
          None
        </div>
      )}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={open}
          className="rounded border border-osi-navy-900 px-3 py-1 text-xs uppercase tracking-wide-label transition-transform duration-200 active:scale-[0.97]"
        >
          {value ? `Change ${label}` : `Choose ${label}`}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-left text-xs text-osi-slate-400 transition-transform duration-200 hover:underline active:scale-[0.97]"
          >
            Remove
          </button>
        )}
      </div>

      {mounted &&
        createPortal(
          <dialog
            ref={dialogRef}
            onClose={() => setIsOpen(false)}
            aria-labelledby="media-picker-dialog-title"
            className="w-[90vw] max-w-3xl rounded-lg border border-osi-sand-300 bg-osi-white p-0 backdrop:bg-osi-navy-900/60"
          >
            <div className="flex items-center justify-between border-b border-osi-sand-300 px-5 py-3">
              <h2 id="media-picker-dialog-title" className="font-display text-sm tracking-wide-display uppercase">
                Media library
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close media library"
                className="text-sm opacity-60 transition-opacity duration-200 hover:opacity-100"
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-5">
              {isOpen && <MediaBrowser accept={accept} onSelect={select} onUploaded={select} />}
            </div>
          </dialog>,
          document.body,
        )}
    </div>
  );
}
