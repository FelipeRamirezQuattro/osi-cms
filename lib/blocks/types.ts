import type { ReactElement } from "react";
import type { ZodType } from "zod";
import type { FieldSpec } from "@/lib/blocks/admin-fields";
import type { TypographySlot } from "@/lib/fonts/catalog";

export type BlockAppearanceCapabilities = {
  surface: boolean;
  accent: boolean;
  typography: readonly TypographySlot[];
};

/**
 * Threaded through every block's Render call by BlockRenderer (Task 10) —
 * cycle/depth guards the `shared_section` reference block needs to render
 * safely (components/blocks/shared-section.tsx). Every other block
 * ignores both props entirely (they're optional and unused), so this is
 * additive: no existing `Render: ({ data }) => ...` implementation needs
 * to change.
 */
export type BlockRenderExtras = {
  /** Keys of shared sections already rendered along the current path — cycle guard. */
  visitedSharedSectionKeys?: ReadonlySet<string>;
  /** Recursion depth through nested shared_section blocks — depth guard. */
  sharedSectionDepth?: number;
};

// Several blocks fetch their own data (news_feed, global_map,
// team_directory, product_grid) and so are async Server Components —
// React's ComponentType doesn't model that, hence the explicit union.
export type BlockRenderComponent<T> =
  | ((props: { data: T } & BlockRenderExtras) => ReactElement | null)
  | ((props: { data: T } & BlockRenderExtras) => Promise<ReactElement | null>);

export interface BlockDefinition<T> {
  type: string;
  label: string;
  category: "hero" | "content" | "commerce" | "media" | "forms" | "layout";
  /**
   * One sentence of suitable-use guidance for the admin block picker
   * (e.g. "when to use this vs. a similar block") — surfaced today as a
   * tooltip/helper line in the picker dropdown (see page-editor.tsx); a
   * fuller searchable/categorized picker is a later task's scope (Task
   * 13 in the CMS remediation plan).
   */
  description: string;
  schema: ZodType<T>;
  defaults: T;
  Render: BlockRenderComponent<T>;
  /** Block-specific admin form fields — COMMON_ADMIN_FIELDS is prepended by the editor UI. */
  adminFields: FieldSpec[];
  /** Filled centrally by the registry for every block type. */
  appearance?: BlockAppearanceCapabilities;
}

// Registry entries are stored type-erased (the registry itself doesn't
// need to know each block's concrete data shape); each block module
// keeps full type safety internally.
export function defineBlock<T>(def: BlockDefinition<T>): BlockDefinition<unknown> {
  return def as unknown as BlockDefinition<unknown>;
}
