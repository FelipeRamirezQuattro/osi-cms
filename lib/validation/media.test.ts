import { describe, expect, it } from "vitest";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_DOCUMENT_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES,
  parseTagsInput,
  validateAltRequirement,
  validateUploadFile,
} from "@/lib/validation/media";

/**
 * Task 11: server-side MIME/extension/size enforcement (the brief noted
 * this "may be missing" today — it was: the old uploadMediaAsset trusted
 * whatever the browser sent) and the alt-required-unless-decorative
 * discipline, generalized from the `image` block's own rule
 * (components/blocks/image.tsx, Task 9) to the media library itself.
 */

describe("validateUploadFile", () => {
  it("accepts every allowed image MIME type with a matching extension", () => {
    for (const mime of ALLOWED_IMAGE_MIME_TYPES) {
      const ext = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
      const result = validateUploadFile({ name: `photo.${ext}`, type: mime, size: 1024 });
      expect(result).toEqual({ ok: true, kind: "image" });
    }
  });

  it("accepts a PDF as a document", () => {
    const result = validateUploadFile({ name: "datasheet.pdf", type: "application/pdf", size: 1024 });
    expect(result).toEqual({ ok: true, kind: "document" });
  });

  it("rejects an unsupported MIME type outright", () => {
    const result = validateUploadFile({ name: "clip.mp4", type: "video/mp4", size: 1024 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/unsupported file type/i);
  });

  it("rejects an SVG even though nothing in the pipeline sanitizes it", () => {
    const result = validateUploadFile({ name: "icon.svg", type: "image/svg+xml", size: 512 });
    expect(result.ok).toBe(false);
  });

  it("rejects a mismatched extension for an otherwise-allowed MIME type", () => {
    // A renamed .exe reporting image/png, for example — the extension
    // must also belong to the detected kind's allowlist.
    const result = validateUploadFile({ name: "payload.exe", type: "image/png", size: 1024 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/extension/i);
  });

  it("rejects an empty file", () => {
    const result = validateUploadFile({ name: "empty.png", type: "image/png", size: 0 });
    expect(result.ok).toBe(false);
  });

  it("rejects an image over the image size limit", () => {
    const result = validateUploadFile({ name: "huge.png", type: "image/png", size: MAX_IMAGE_SIZE_BYTES + 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/too large/i);
  });

  it("accepts an image exactly at the size limit", () => {
    const result = validateUploadFile({ name: "max.png", type: "image/png", size: MAX_IMAGE_SIZE_BYTES });
    expect(result).toEqual({ ok: true, kind: "image" });
  });

  it("rejects a document over the (larger) document size limit but allows an image-sized document under it", () => {
    const tooLarge = validateUploadFile({
      name: "big.pdf",
      type: ALLOWED_DOCUMENT_MIME_TYPES[0],
      size: MAX_DOCUMENT_SIZE_BYTES + 1,
    });
    expect(tooLarge.ok).toBe(false);

    const ok = validateUploadFile({
      name: "brochure.pdf",
      type: ALLOWED_DOCUMENT_MIME_TYPES[0],
      size: MAX_IMAGE_SIZE_BYTES + 1, // bigger than the image cap, still under the document cap
    });
    expect(ok).toEqual({ ok: true, kind: "document" });
  });
});

describe("validateAltRequirement", () => {
  it("requires non-empty alt text for a meaningful (non-decorative) image", () => {
    expect(validateAltRequirement("image", "", false)).toMatch(/alt text is required/i);
    expect(validateAltRequirement("image", "   ", false)).toMatch(/alt text is required/i);
  });

  it("accepts real alt text for a non-decorative image", () => {
    expect(validateAltRequirement("image", "ESP Gas Release System diagram", false)).toBeNull();
  });

  it("does not require alt text when the image is explicitly marked decorative", () => {
    expect(validateAltRequirement("image", "", true)).toBeNull();
  });

  it("never requires alt text for a document (PDF) — the concept doesn't apply", () => {
    expect(validateAltRequirement("document", "", false)).toBeNull();
  });
});

describe("parseTagsInput", () => {
  it("splits, trims, lowercases, and dedupes a comma-separated list", () => {
    expect(parseTagsInput(" Hero,  Hero ,gas-release, Gas-Release ")).toEqual(["hero", "gas-release"]);
  });

  it("returns an empty array for blank/undefined input", () => {
    expect(parseTagsInput(undefined)).toEqual([]);
    expect(parseTagsInput("")).toEqual([]);
    expect(parseTagsInput("   ")).toEqual([]);
  });
});
