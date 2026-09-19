import type { ReactElement } from "react";
import type { ZodType } from "zod";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

/** Passed to every email block's Render. Email clients need absolute URLs everywhere. */
export type EmailBlockContext = {
  /** Link targets: a site-relative path ("/products") or absolute URL -> absolute URL. */
  resolveUrl: (value: string) => string;
  /**
   * Image sources -> absolute URL, through lib/media.ts (CLAUDE.md constraint 3).
   * Deliberately separate from resolveUrl: resolveMediaUrl treats every
   * non-absolute value as a legacy media path, which would corrupt a link.
   */
  resolveImage: (value: string) => string;
};

export interface EmailBlockDefinition<T> {
  type: string;
  label: string;
  /** One sentence of guidance shown in the editor's "add block" picker. */
  description: string;
  schema: ZodType<T>;
  defaults: T;
  adminFields: FieldSpec[];
  Render: (props: { data: T; ctx: EmailBlockContext }) => ReactElement;
}

// Same type-erased storage as lib/blocks/types.ts: the registry doesn't need
// each block's concrete data shape, and each block module keeps full type
// safety internally.
export function defineEmailBlock<T>(def: EmailBlockDefinition<T>): EmailBlockDefinition<unknown> {
  return def as unknown as EmailBlockDefinition<unknown>;
}
