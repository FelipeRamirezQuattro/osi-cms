"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { AsyncMessage } from "@/components/admin/ui/async-message";
import Image from "next/image";
import {
  listMediaAction,
  listMediaFoldersAction,
  listMediaTagsAction,
  updateMediaMetadataAction,
  uploadMediaAction,
  type MediaAsset,
  type UpdateMetadataState,
  type UploadMediaState,
} from "@/lib/actions/media";
import { ALLOWED_DOCUMENT_MIME_TYPES, ALLOWED_IMAGE_MIME_TYPES, ALLOWED_MODEL_EXTENSIONS } from "@/lib/validation/media";
import { resolveMediaUrl } from "@/lib/media";

/**
 * Task 11 — the grid/card/search/empty/loading states shared by
 * MediaPicker's in-form dialog and the standalone /admin/media page
 * (previously duplicated near-verbatim between the two — see
 * components/admin/media-picker.tsx and
 * app/admin/(dashboard)/media/media-library.tsx before this task).
 *
 * MediaBrowser owns: fetching (paginated, debounced-search, folder/tag
 * filters, stale-request protection), the upload form, per-asset
 * metadata editing (no re-upload required), and rendering the grid.
 * It does NOT own deletion or the replace-everywhere flow — those are
 * mode-specific (only the standalone library exposes them, gated by the
 * `delete_media` capability) and are injected via `renderCardFooter` so
 * this component stays agnostic to who's allowed to delete what.
 */

const initialUploadState: UploadMediaState = { status: "idle" };
const initialMetadataState: UpdateMetadataState = { status: "idle" };
const PAGE_SIZE = 24;
const DEBOUNCE_MS = 300;

export type MediaBrowserAccept = "image" | "file" | "model";

export type MediaBrowserProps = {
  /** Restricts the upload input + listing to a kind. Default "image" — matches every existing MediaPicker caller. */
  accept?: MediaBrowserAccept;
  /** Picker mode: clicking an asset's thumbnail calls this instead of just expanding its metadata editor. */
  onSelect?: (asset: MediaAsset) => void;
  /** Called after a successful upload, in addition to the browser's own list refresh (e.g. the picker auto-selects and closes). */
  onUploaded?: (asset: MediaAsset) => void;
  /** Library-mode-only actions (Delete / usage+replace) rendered under each card. Receives a `refresh` callback to re-run after a mutation. */
  renderCardFooter?: (asset: MediaAsset, helpers: { refresh: () => void }) => ReactNode;
  emptyMessage?: string;
};

type MediaQuery = { search: string; folder: string; tag: string; offset: number };

const INITIAL_QUERY: MediaQuery = { search: "", folder: "", tag: "", offset: 0 };

export function MediaBrowser({
  accept = "image",
  onSelect,
  onUploaded,
  renderCardFooter,
  emptyMessage,
}: MediaBrowserProps) {
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  // Raw text-box value (updates every keystroke, for a responsive
  // input) vs. the debounced `query.search` actually sent to the
  // server — kept separate so typing doesn't refetch on every
  // keystroke.
  const [rawSearch, setRawSearch] = useState("");
  const [query, setQuery] = useState<MediaQuery>(INITIAL_QUERY);
  // Bumped to force a refetch of the *current* query (e.g. after an
  // upload, or a delete/replace in the library) without changing any
  // filter — a plain state update, deliberately not a ref, so the
  // `refresh` callback handed to `renderCardFooter` (called during this
  // component's render, by a caller-supplied function this component
  // can't see inside) never reads a ref value mid-render (see the
  // fetch effect below for where the actual, ref-touching request
  // happens instead).
  const [refreshTick, setRefreshTick] = useState(0);
  const [folders, setFolders] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, startLoading] = useTransition();

  // Stale-request protection: an in-flight request that resolves after a
  // newer one has already started must not clobber the newer results —
  // each fetch stamps the ref with its own id before awaiting, and only
  // applies its result if it's still the most recent one issued. Only
  // ever read/written from inside the effect below (an effect, not
  // render) — see react-hooks/refs.
  const requestIdRef = useRef(0);

  // Debounce: only adopt the text box's value into the actual query
  // (triggering a request) DEBOUNCE_MS after the user stops typing.
  useEffect(() => {
    const handle = setTimeout(() => {
      setQuery((q) => (q.search === rawSearch ? q : { ...q, search: rawSearch, offset: 0 }));
    }, DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [rawSearch]);

  // The one place an actual request is issued — runs on mount, on every
  // query change (search/folder/tag/offset), and whenever refreshCurrent()
  // bumps refreshTick.
  useEffect(() => {
    const requestId = ++requestIdRef.current;
    startLoading(async () => {
      const result = await listMediaAction({
        search: query.search || undefined,
        folder: query.folder || undefined,
        tag: query.tag || undefined,
        kind: accept === "file" ? "document" : accept === "model" ? "model" : "image",
        limit: PAGE_SIZE,
        offset: query.offset,
      });
      if (requestId !== requestIdRef.current) return; // a newer request has since started (or resolved) — drop this one
      setAssets(result.assets);
      setTotal(result.total);
    });
  }, [query, refreshTick, accept]);

  useEffect(() => {
    listMediaFoldersAction().then(setFolders);
    listMediaTagsAction().then(setTags);
  }, [refreshTick]);

  function onFolderChange(value: string) {
    setQuery((q) => ({ ...q, folder: value, offset: 0 }));
  }

  function onTagChange(value: string) {
    setQuery((q) => ({ ...q, tag: value, offset: 0 }));
  }

  function goToOffset(nextOffset: number) {
    setQuery((q) => ({ ...q, offset: nextOffset }));
  }

  /** Re-runs the current query as-is — a plain state bump, safe to hand to a render-time-invoked renderCardFooter. */
  function refreshCurrent() {
    setRefreshTick((t) => t + 1);
  }

  function handleUploaded(asset: MediaAsset) {
    refreshCurrent();
    onUploaded?.(asset);
  }

  return (
    <div className="space-y-4">
      <MediaUploadForm accept={accept} onUploaded={handleUploaded} folders={folders} />

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={rawSearch}
          onChange={(e) => setRawSearch(e.target.value)}
          placeholder="Search by title, alt text, filename, or URL…"
          className="min-w-[12rem] flex-1 rounded border border-osi-sand-300 px-3 py-2 text-sm"
        />
        {folders.length > 0 && (
          <select
            value={query.folder}
            onChange={(e) => onFolderChange(e.target.value)}
            className="rounded border border-osi-sand-300 px-2 py-2 text-sm"
            aria-label="Filter by folder"
          >
            <option value="">All folders</option>
            {folders.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        )}
        {tags.length > 0 && (
          <select
            value={query.tag}
            onChange={(e) => onTagChange(e.target.value)}
            className="rounded border border-osi-sand-300 px-2 py-2 text-sm"
            aria-label="Filter by tag"
          >
            <option value="">All tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6" aria-busy={isLoading}>
        {isLoading && <p className="col-span-full text-xs text-osi-slate-400">Loading…</p>}
        {!isLoading && assets.length === 0 && (
          <p className="col-span-full text-xs text-osi-slate-400">{emptyMessage ?? "No media found."}</p>
        )}
        {!isLoading &&
          assets.map((asset) => (
            <MediaAssetCard
              key={asset.id}
              asset={asset}
              onSelect={onSelect}
              footer={renderCardFooter?.(asset, { refresh: refreshCurrent })}
            />
          ))}
      </div>

      <div className="flex items-center justify-between text-xs text-osi-slate-500">
        <span>
          {total === 0
            ? "0 results"
            : `${query.offset + 1}–${Math.min(query.offset + assets.length, total)} of ${total}`}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={query.offset === 0 || isLoading}
            onClick={() => goToOffset(Math.max(0, query.offset - PAGE_SIZE))}
            className="rounded border border-osi-navy-900 px-2 py-1 uppercase tracking-wide-label disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={query.offset + PAGE_SIZE >= total || isLoading}
            onClick={() => goToOffset(query.offset + PAGE_SIZE)}
            className="rounded border border-osi-navy-900 px-2 py-1 uppercase tracking-wide-label disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function isImageAsset(asset: MediaAsset): boolean {
  return !asset.mime || asset.mime.startsWith("image/");
}

function assetKindLabel(asset: MediaAsset): string {
  if (asset.mime === "model/gltf-binary") return "GLB";
  if (asset.mime === "model/vnd.usdz+zip") return "USDZ";
  return (asset.mime?.split("/")[1] ?? "file").toUpperCase();
}

function MediaAssetCard({
  asset,
  onSelect,
  footer,
}: {
  asset: MediaAsset;
  onSelect?: (asset: MediaAsset) => void;
  footer?: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [current, setCurrent] = useState(asset);
  const isImage = isImageAsset(current);

  const thumb = isImage ? (
    <Image src={resolveMediaUrl(current.url)} alt={current.alt ?? ""} fill className="object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center bg-osi-sand-100 text-[10px] font-display uppercase tracking-wide-label text-osi-slate-400">
      {assetKindLabel(current)}
    </div>
  );

  return (
    <div className="space-y-1 rounded border border-osi-sand-300 bg-osi-white p-2">
      {onSelect ? (
        <button
          type="button"
          onClick={() => onSelect(current)}
          className="relative block aspect-square w-full overflow-hidden rounded transition-transform duration-200 hover:ring-2 hover:ring-osi-gold-500 active:scale-[0.97]"
          title={current.title ?? current.url}
        >
          {thumb}
        </button>
      ) : (
        <div className="relative aspect-square overflow-hidden rounded" title={current.title ?? current.url}>
          {thumb}
        </div>
      )}
      <p className="truncate text-xs opacity-70" title={current.title ?? current.url}>
        {current.title ?? current.filename ?? current.url}
      </p>
      <div className="flex items-center justify-between text-[10px] uppercase opacity-40">
        <span>
          {current.source}
          {current.decorative ? " · decorative" : ""}
        </span>
        <button type="button" onClick={() => setEditing((v) => !v)} className="underline">
          {editing ? "Close" : "Edit"}
        </button>
      </div>
      {editing && (
        <MediaMetadataEditor
          asset={current}
          onSaved={(updated) => {
            setCurrent(updated);
            setEditing(false);
          }}
        />
      )}
      {footer}
    </div>
  );
}

/** Metadata editing without re-uploading (Task 11 acceptance criterion) — title/alt/decorative/caption/credit/folder/tags. */
function MediaMetadataEditor({ asset, onSaved }: { asset: MediaAsset; onSaved: (asset: MediaAsset) => void }) {
  const boundAction = updateMediaMetadataAction.bind(null, asset.id);
  const [state, formAction] = useActionState(boundAction, initialMetadataState);
  const [decorative, setDecorative] = useState(asset.decorative ?? false);

  useEffect(() => {
    if (state.status === "success" && state.asset) {
      onSaved(state.asset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const fieldClass = "mt-0.5 w-full rounded border border-osi-sand-300 px-2 py-1 text-xs";

  return (
    <form action={formAction} className="space-y-2 border-t border-osi-sand-300 pt-2 text-xs">
      <label className="block">
        Title
        <input name="title" defaultValue={asset.title ?? ""} className={fieldClass} />
      </label>
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="decorative"
          defaultChecked={asset.decorative ?? false}
          onChange={(e) => setDecorative(e.target.checked)}
          className="h-3.5 w-3.5"
        />
        Decorative (no alt text needed)
      </label>
      {!decorative && (
        <label className="block">
          Alt text
          <input name="alt" defaultValue={asset.alt ?? ""} className={fieldClass} />
        </label>
      )}
      <label className="block">
        Caption
        <input name="caption" defaultValue={asset.caption ?? ""} className={fieldClass} />
      </label>
      <label className="block">
        Credit
        <input name="credit" defaultValue={asset.credit ?? ""} className={fieldClass} />
      </label>
      <label className="block">
        Folder
        <input name="folder" defaultValue={asset.folder ?? ""} className={fieldClass} />
      </label>
      <label className="block">
        Tags (comma-separated)
        <input name="tags" defaultValue={(asset.tags ?? []).join(", ")} className={fieldClass} />
      </label>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="rounded bg-osi-navy-900 px-3 py-1 uppercase tracking-wide-label text-osi-white transition-transform duration-200 active:scale-[0.97]"
        >
          Save
        </button>
        <AsyncMessage
          message={state.status === "error" ? { kind: "error", text: state.message ?? "Couldn't save changes." } : null}
        />
      </div>
    </form>
  );
}

const IMAGE_ACCEPT = ALLOWED_IMAGE_MIME_TYPES.join(",");
const DOCUMENT_ACCEPT = ALLOWED_DOCUMENT_MIME_TYPES.join(",");
// The file input's accept attribute is a filename-extension filter here
// (not a MIME allowlist) — .glb/.usdz MIME types aren't reliably known
// to OS file pickers the way image/PDF MIME types are, but the OS
// pickers do understand extensions.
const MODEL_ACCEPT = ALLOWED_MODEL_EXTENSIONS.join(",");

function MediaUploadForm({
  accept,
  onUploaded,
  folders,
}: {
  accept: MediaBrowserAccept;
  onUploaded?: (asset: MediaAsset) => void;
  folders: string[];
}) {
  const [state, formAction] = useActionState(uploadMediaAction, initialUploadState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success" && state.asset) {
      onUploaded?.(state.asset);
      formRef.current?.reset(); // clears the plain (uncontrolled) text inputs — file/title/caption/credit/folder/tags
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2 rounded border border-osi-sand-300 bg-osi-white p-4 text-sm">
      {/*
       * UploadFields owns the two pieces of *controlled* local state
       * (decorative, captured width/height) that formRef.reset() above
       * can't touch (a native DOM reset doesn't know about React state).
       * Keying it by the just-created asset's id remounts it fresh after
       * every successful upload instead of resetting that state
       * imperatively in an effect (react-hooks/refs' companion rule
       * flags synchronous setState-in-effect; a key-triggered remount is
       * the idiomatic alternative recommended for exactly this "clear
       * local UI state after an action succeeds" case).
       */}
      <UploadFields key={state.status === "success" ? state.asset?.id : "initial"} accept={accept} folders={folders} />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="rounded bg-osi-navy-900 px-4 py-2 text-xs uppercase tracking-wide-label text-osi-white transition-transform duration-200 active:scale-[0.97]"
        >
          Upload
        </button>
        <AsyncMessage
          message={state.status === "error" ? { kind: "error", text: state.message ?? "Upload failed." } : null}
        />
      </div>
    </form>
  );
}

function UploadFields({ accept, folders }: { accept: MediaBrowserAccept; folders: string[] }) {
  const [decorative, setDecorative] = useState(false);
  const [dimensions, setDimensions] = useState<{ width?: number; height?: number }>({});

  // Width/height are captured client-side (the browser already has to
  // decode the image to preview it) rather than adding an image-parsing
  // dependency server-side for one metadata field — see
  // lib/validation/media.ts's comment on why these are trusted as
  // display hints, never used for access control.
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      setDimensions({});
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const probe = new window.Image();
    probe.onload = () => {
      setDimensions({ width: probe.naturalWidth, height: probe.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    probe.onerror = () => URL.revokeObjectURL(objectUrl);
    probe.src = objectUrl;
  }

  const inputAccept = accept === "file" ? DOCUMENT_ACCEPT : accept === "model" ? MODEL_ACCEPT : IMAGE_ACCEPT;

  const labelClass = "flex flex-col gap-1 text-xs";
  const captionClass = "uppercase tracking-wide-label opacity-60";
  const fieldClass = "rounded border border-osi-sand-300 px-2 py-1";

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <label className={labelClass}>
          <span className={captionClass}>File</span>
          <input type="file" name="file" accept={inputAccept} required onChange={handleFileChange} className="text-sm" />
        </label>
        <input type="hidden" name="width" value={dimensions.width ?? ""} />
        <input type="hidden" name="height" value={dimensions.height ?? ""} />
        <label className={labelClass}>
          <span className={captionClass}>Title (optional)</span>
          <input name="title" autoComplete="off" className={fieldClass} />
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            name="decorative"
            checked={decorative}
            onChange={(e) => setDecorative(e.target.checked)}
            className="h-4 w-4"
          />
          Decorative (no alt text needed)
        </label>
        {!decorative && (
          <label className={`${labelClass} min-w-[10rem] flex-1`}>
            <span className={captionClass}>Alt text (required)</span>
            <input name="alt" placeholder="Describe the image" required autoComplete="off" className={fieldClass} />
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className={labelClass}>
          <span className={captionClass}>Caption (optional)</span>
          <input name="caption" autoComplete="off" className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={captionClass}>Credit (optional)</span>
          <input name="credit" autoComplete="off" className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={captionClass}>Folder (optional)</span>
          <input name="folder" list="media-folder-options" autoComplete="off" spellCheck={false} className={fieldClass} />
        </label>
        <label className={labelClass}>
          <span className={captionClass}>Tags</span>
          <input name="tags" placeholder="comma-separated" autoComplete="off" spellCheck={false} className={fieldClass} />
        </label>
      </div>
      <datalist id="media-folder-options">
        {folders.map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
    </>
  );
}
