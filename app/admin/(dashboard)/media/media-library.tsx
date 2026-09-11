"use client";

import { useActionState, useState, useTransition } from "react";
import Image from "next/image";
import { deleteMediaActionFn, listMediaAction, uploadMediaAction, type UploadMediaState } from "@/lib/actions/media";
import type { MediaAsset } from "@/lib/data/media";
import { resolveMediaUrl } from "@/lib/media";

const initialUploadState: UploadMediaState = { status: "idle" };

export function MediaLibrary({ initialAssets }: { initialAssets: MediaAsset[] }) {
  const [assets, setAssets] = useState(initialAssets);
  const [search, setSearch] = useState("");
  const [isLoading, startLoading] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [uploadState, uploadFormAction] = useActionState(uploadMediaAction, initialUploadState);

  function refresh(q?: string) {
    startLoading(async () => {
      setAssets(await listMediaAction(q));
    });
  }

  function onSearch(value: string) {
    setSearch(value);
    refresh(value);
  }

  function onDelete(id: string) {
    if (!window.confirm("Delete this media asset? Pages using it will show a broken image.")) return;
    startDeleting(async () => {
      await deleteMediaActionFn(id);
      refresh(search);
    });
  }

  const justUploaded = uploadState.status === "success" && uploadState.asset;
  if (justUploaded && !assets.some((a) => a.id === uploadState.asset!.id)) {
    setAssets([uploadState.asset!, ...assets]);
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-lg tracking-wide-display uppercase">Media library</h1>

      <form action={uploadFormAction} className="flex items-center gap-3 rounded border border-osi-sand-300 bg-osi-white p-4">
        <input type="file" name="file" accept="image/*" required className="text-sm" />
        <input
          name="alt"
          placeholder="Alt text (required)"
          required
          className="rounded border border-osi-sand-300 px-2 py-1 text-sm"
        />
        <button type="submit" className="rounded bg-osi-navy-900 px-4 py-2 text-xs uppercase tracking-wide-label text-osi-white">
          Upload
        </button>
        {uploadState.status === "error" && <span className="text-xs text-red-600">{uploadState.message}</span>}
      </form>

      <input
        type="text"
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search by title, alt text, or URL…"
        className="w-full max-w-md rounded border border-osi-sand-300 px-3 py-2 text-sm"
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
        {isLoading && <p className="col-span-full text-xs text-osi-slate-400">Loading…</p>}
        {!isLoading && assets.length === 0 && <p className="col-span-full text-xs text-osi-slate-400">No media yet.</p>}
        {assets.map((asset) => (
          <div key={asset.id} className="space-y-1 rounded border border-osi-sand-300 bg-osi-white p-2">
            <div className="relative aspect-square overflow-hidden rounded">
              <Image src={resolveMediaUrl(asset.url)} alt={asset.alt ?? ""} fill className="object-cover" />
            </div>
            <p className="truncate text-xs opacity-70" title={asset.title ?? asset.url}>
              {asset.title ?? asset.url}
            </p>
            <p className="text-[10px] uppercase opacity-40">{asset.source}</p>
            {asset.source === "uploaded" && (
              <button
                type="button"
                onClick={() => onDelete(asset.id)}
                disabled={isDeleting}
                className="text-[10px] text-red-600 hover:underline disabled:opacity-40"
              >
                Delete
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
