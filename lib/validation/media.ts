import { z } from "zod";

/**
 * lib/actions/media.ts's upload boundary. The alt-text requirement
 * itself already existed (a hand-rolled `.trim()` check — see
 * docs/DECISIONS.md on why alt text is enforced only here, not per block
 * image field) — this just gives it the same Zod-schema shape as every
 * other mutation boundary, so a future field (e.g. a title/caption) has
 * somewhere to go rather than another ad hoc check appended to the
 * action.
 */
export const mediaUploadSchema = z.object({
  alt: z
    .string()
    .trim()
    .min(1, "Alt text is required — describe what the image shows."),
});

export type MediaUploadInput = z.infer<typeof mediaUploadSchema>;
