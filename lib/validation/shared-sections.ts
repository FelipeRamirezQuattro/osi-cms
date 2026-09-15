import { z } from "zod";
import { requiredString } from "@/lib/validation/common";

/**
 * Task 10: reusable global sections. `key` is the stable identifier every
 * `shared_section` reference block (components/blocks/shared-section.tsx)
 * stores and looks up by — set once at creation (createSharedSectionSchema)
 * and never edited afterwards via the draft-save RPC (see the migration's
 * top comment for why).
 */
export const sharedSectionKeySchema = z
  .string()
  .trim()
  .min(1, "Key is required")
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Key must be lowercase letters, numbers, and hyphens (e.g. \"footer-cta\")");

export const createSharedSectionSchema = z.object({
  key: sharedSectionKeySchema,
  title: requiredString("Title"),
});

export type CreateSharedSectionInput = z.infer<typeof createSharedSectionSchema>;

export const sharedSectionTitleSchema = requiredString("Title");
