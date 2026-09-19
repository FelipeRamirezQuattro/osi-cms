import { z } from "zod";

/**
 * lib/actions/media.ts's upload/metadata-edit boundary (Task 11 of the
 * CMS remediation plan — "generalize and harden the media library").
 *
 * MIME/extension/size enforcement lives here, not just in the form's
 * `accept`/no client-side check: a direct POST (or a modified request)
 * can bypass any client-side restriction, so this is the one place
 * every upload — from MediaPicker's in-form dialog or the standalone
 * /admin/media page — is actually validated, server-side.
 *
 * "Documents" per the Task 11 brief means PDF only for now (matches the
 * one real document use case in this codebase — resources.file_url
 * brochures/datasheets, see lib/admin/entity-config.ts — and CLAUDE.md's
 * content-gaps note that no legacy PDFs exist at all yet, so there's no
 * back-compat surface to preserve for a second document type). Widening
 * to office formats is a one-line addition to ALLOWED_DOCUMENT_* if a
 * real need shows up. SVG is deliberately excluded from the image
 * allowlist — an uploaded SVG can carry an embedded `<script>`, and nothing
 * in this pipeline sanitizes SVG markup before it's served back with
 * `Content-Type: image/svg+xml`.
 *
 * Hosted video is explicitly NOT supported by this upload path (see
 * docs/DECISIONS.md, Task 11) — the brief gates it behind defining file-
 * size/bandwidth/provider limits, which nobody has done. External video
 * stays embed-only via the `embed`/`video_embed` blocks.
 */

export const MEDIA_KINDS = ["image", "document"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"] as const;
export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"] as const;
export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

export const ALLOWED_DOCUMENT_MIME_TYPES = ["application/pdf"] as const;
export const ALLOWED_DOCUMENT_EXTENSIONS = [".pdf"] as const;
export const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

function extensionOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx).toLowerCase();
}

export type UploadFileLike = { name: string; type: string; size: number };

export type UploadValidationResult =
  | { ok: true; kind: MediaKind }
  | { ok: false; message: string };

/**
 * The single MIME/extension/size gate every upload goes through
 * (lib/data/media.ts's uploadMediaAsset calls this directly, so it's
 * enforced regardless of caller — the Server Action calls it too, only
 * to surface a friendly error before ever touching Storage).
 */
export function validateUploadFile(file: UploadFileLike): UploadValidationResult {
  const mime = file.type || "";
  const ext = extensionOf(file.name);

  const isImageMime = (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(mime);
  const isDocumentMime = (ALLOWED_DOCUMENT_MIME_TYPES as readonly string[]).includes(mime);

  if (!isImageMime && !isDocumentMime) {
    return {
      ok: false,
      message: `Unsupported file type "${mime || "unknown"}". Allowed: JPG/PNG/WEBP/AVIF/GIF images or PDF documents.`,
    };
  }

  const kind: MediaKind = isImageMime ? "image" : "document";
  const allowedExts = kind === "image" ? ALLOWED_IMAGE_EXTENSIONS : ALLOWED_DOCUMENT_EXTENSIONS;
  if (!(allowedExts as readonly string[]).includes(ext)) {
    return {
      ok: false,
      message: `File extension "${ext || "(none)"}" doesn't match its type (${mime}). Rename the file or choose a different one.`,
    };
  }

  const maxSize = kind === "image" ? MAX_IMAGE_SIZE_BYTES : MAX_DOCUMENT_SIZE_BYTES;
  if (file.size <= 0) {
    return { ok: false, message: "The file appears to be empty." };
  }
  if (file.size > maxSize) {
    return {
      ok: false,
      message: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB) — the limit for ${kind}s is ${maxSize / (1024 * 1024)}MB.`,
    };
  }

  return { ok: true, kind };
}

/**
 * Alt-text discipline, generalized from the same rule Task 9 added to
 * the `image` block (components/blocks/image.tsx): meaningful images
 * require real alt text; `decorative: true` is the explicit escape
 * hatch instead of a fake/empty alt string. Documents (PDFs) don't carry
 * this requirement — "alt text" isn't a meaningful WCAG concept for a
 * downloadable file the way it is for an `<img>`.
 */
export function validateAltRequirement(kind: MediaKind, alt: string, decorative: boolean): string | null {
  if (kind !== "image") return null;
  if (decorative) return null;
  if (alt.trim().length === 0) {
    return "Alt text is required unless the image is marked decorative.";
  }
  return null;
}

/** Comma-separated free text -> a deduped, lowercased, trimmed tag list. */
export function parseTagsInput(raw: string | undefined | null): string[] {
  if (!raw) return [];
  const tags = raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set(tags));
}

/**
 * Shared shape for both the upload form and the metadata-edit form
 * (lib/actions/media.ts) — width/height are trusted from the client
 * (captured via an <img> load in the browser, see
 * components/admin/media/media-upload-form.tsx) since they're display
 * hints only, never used for access control or storage decisions.
 */
export const mediaMetadataSchema = z.object({
  title: z.string().trim().optional(),
  alt: z.string().trim().optional().default(""),
  decorative: z.coerce.boolean().optional().default(false),
  caption: z.string().trim().optional(),
  credit: z.string().trim().optional(),
  folder: z.string().trim().optional(),
  tags: z.string().optional(),
  width: z.coerce.number().int().positive().optional(),
  height: z.coerce.number().int().positive().optional(),
});

export type MediaMetadataInput = z.infer<typeof mediaMetadataSchema>;

// Kept for the pre-Task-11 shape some callers may still reference —
// mediaMetadataSchema is the superset used by both upload and edit now.
export const mediaUploadSchema = mediaMetadataSchema;
