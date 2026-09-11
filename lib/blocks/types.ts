import type { ReactElement } from "react";
import type { ZodType } from "zod";

// Several blocks fetch their own data (news_feed, global_map,
// team_directory, product_grid) and so are async Server Components —
// React's ComponentType doesn't model that, hence the explicit union.
export type BlockRenderComponent<T> =
  | ((props: { data: T }) => ReactElement | null)
  | ((props: { data: T }) => Promise<ReactElement | null>);

export interface BlockDefinition<T> {
  type: string;
  label: string;
  category: "hero" | "content" | "commerce" | "media" | "forms" | "layout";
  schema: ZodType<T>;
  defaults: T;
  Render: BlockRenderComponent<T>;
}

// Registry entries are stored type-erased (the registry itself doesn't
// need to know each block's concrete data shape); each block module
// keeps full type safety internally.
export function defineBlock<T>(def: BlockDefinition<T>): BlockDefinition<unknown> {
  return def as unknown as BlockDefinition<unknown>;
}
