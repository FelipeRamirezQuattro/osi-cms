import { getBlockDefinition } from "@/lib/blocks/registry";
import { formatZodError } from "@/lib/validation/common";

/**
 * Shared block-list validation, used by both lib/actions/pages.ts
 * (saveDraftAction) and lib/actions/shared-sections.ts (Task 10) — a
 * page's blocks and a shared section's blocks both go through the exact
 * same registry-driven Zod validation before being written, so this
 * lives outside either "use server" action file (which may only export
 * async functions — every export becomes a Server Action reference) as
 * a plain, importable helper.
 */
export type BlockValidationInput = { type: string; data: Record<string, unknown> };

export type BlockValidationError = {
  status: "error";
  message: string;
  blockIndex: number;
  field?: string;
};

export function validateBlockList(blocks: BlockValidationInput[]): BlockValidationError | null {
  for (let i = 0; i < blocks.length; i++) {
    const definition = getBlockDefinition(blocks[i].type);
    if (!definition) {
      return { status: "error", message: `Unknown block type "${blocks[i].type}"`, blockIndex: i };
    }
    const parsed = definition.schema.safeParse(blocks[i].data);
    if (!parsed.success) {
      const { message, field } = formatZodError(parsed.error);
      return {
        status: "error",
        message: `Block ${i + 1} (${definition.label}): ${message}`,
        blockIndex: i,
        field,
      };
    }
  }
  return null;
}
