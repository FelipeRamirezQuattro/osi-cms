import { getBlockDefinition } from "@/lib/blocks/registry";
import { COMMON_ADMIN_FIELDS } from "@/lib/blocks/admin-fields";
import { describeIssue, issueField } from "@/lib/validation/issue-messages";

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
      const specs = [...COMMON_ADMIN_FIELDS, ...definition.adminFields];
      // Every problem in the block (one per field), not just the first, so an editor fixes
      // them in one pass — e.g. an AR model missing both its .glb and .usdz.
      const seen = new Set<string>();
      const sentences: string[] = [];
      let total = 0;
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".");
        if (seen.has(key)) continue;
        seen.add(key);
        total += 1;
        if (sentences.length < 4) sentences.push(describeIssue(issue, { specs, data: blocks[i].data }).replace(/\.$/, ""));
      }
      const more = total - sentences.length;
      return {
        status: "error",
        message: `${definition.label} block (position ${i + 1}): ${sentences.join("; ")}${more > 0 ? `; …and ${more} more` : ""}.`,
        blockIndex: i,
        field: issueField(parsed.error.issues[0]),
      };
    }
  }
  return null;
}
