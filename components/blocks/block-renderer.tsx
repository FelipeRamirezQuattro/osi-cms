import { getBlockDefinition } from "@/lib/blocks/registry";
import type { Tables } from "@/lib/db/database.types";

function DevDiagnostic({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") return null;
  return <div className="bg-red-600 p-4 font-mono text-sm text-white">{children}</div>;
}

/**
 * Renders a page's blocks. An unknown type or data that fails its Zod
 * schema never crashes the page — silently skipped in production, a
 * loud diagnostic in development (see master prompt §6).
 */
export function BlockRenderer({ blocks }: { blocks: Tables<"page_blocks">[] }) {
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
        return <Render key={block.id} data={parsed.data} />;
      })}
    </>
  );
}
