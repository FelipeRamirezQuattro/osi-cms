import { getBlockDefinition } from "@/lib/blocks/registry";
import type { Tables } from "@/lib/db/database.types";

function DevDiagnostic({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") return null;
  return <div className="bg-red-600 p-4 font-mono text-sm text-white">{children}</div>;
}

/** Structurally satisfied by both Tables<"page_blocks"> and Tables<"shared_section_blocks"> rows. */
export type RenderableBlock = Pick<Tables<"page_blocks">, "id" | "type" | "data">;

const EMPTY_VISITED_KEYS: ReadonlySet<string> = new Set();

/**
 * Renders a list of blocks — a page's or (recursively, via the
 * `shared_section` reference block, see components/blocks/shared-section.tsx)
 * a published shared section's. An unknown type or data that fails its
 * Zod schema never crashes the page — silently skipped in production, a
 * loud diagnostic in development (see master prompt §6).
 *
 * `visitedSharedSectionKeys`/`sharedSectionDepth` (Task 10) exist purely
 * to carry shared-section cycle/depth state through recursive calls to
 * this same component; every ordinary block ignores both (ordinary
 * Render components only destructure `{ data }`) — see
 * lib/blocks/types.ts's BlockRenderExtras.
 */
export function BlockRenderer({
  blocks,
  visitedSharedSectionKeys = EMPTY_VISITED_KEYS,
  sharedSectionDepth = 0,
}: {
  blocks: RenderableBlock[];
  visitedSharedSectionKeys?: ReadonlySet<string>;
  sharedSectionDepth?: number;
}) {
  return (
    <>
      {blocks.map((block) => {
        const definition = getBlockDefinition(block.type);
        if (!definition) {
          return (
            <DevDiagnostic key={block.id}>Unknown block type: &quot;{block.type}&quot;</DevDiagnostic>
          );
        }

        const parsed = definition.schema.safeParse(block.data);
        if (!parsed.success) {
          return (
            <DevDiagnostic key={block.id}>
              Invalid data for block &quot;{block.type}&quot;: {parsed.error.message}
            </DevDiagnostic>
          );
        }

        const Render = definition.Render;
        return (
          <Render
            key={block.id}
            data={parsed.data}
            visitedSharedSectionKeys={visitedSharedSectionKeys}
            sharedSectionDepth={sharedSectionDepth}
          />
        );
      })}
    </>
  );
}
