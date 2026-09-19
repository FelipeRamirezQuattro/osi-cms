import {
  emailArticleCardBlock,
  emailButtonBlock,
  emailDividerBlock,
  emailHeadingBlock,
  emailImageBlock,
  emailTextBlock,
} from "@/components/email/blocks";
import type { FieldSpec } from "@/lib/blocks/admin-fields";
import type { EmailBlockDefinition } from "@/lib/email-blocks/types";

/** Newsletter blocks, keyed by type — separate from lib/blocks/registry.ts so web blocks are untouched. */
export const emailBlockRegistry: Record<string, EmailBlockDefinition<unknown>> = {
  heading: emailHeadingBlock,
  text: emailTextBlock,
  image: emailImageBlock,
  button: emailButtonBlock,
  divider: emailDividerBlock,
  article_card: emailArticleCardBlock,
};

export type EmailBlockPaletteEntry = {
  type: string;
  label: string;
  description: string;
  adminFields: FieldSpec[];
  defaults: Record<string, unknown>;
};

/**
 * Client-safe summary for the campaign editor. The full definitions carry a
 * ZodType and a React renderer, neither serializable to a Client Component
 * (same reasoning as getBlockPalette() in lib/blocks/registry.ts).
 */
export function getEmailBlockPalette(): EmailBlockPaletteEntry[] {
  return Object.values(emailBlockRegistry).map((def) => ({
    type: def.type,
    label: def.label,
    description: def.description,
    adminFields: def.adminFields,
    defaults: def.defaults as Record<string, unknown>,
  }));
}

export type EmailBlockInstance = { type: string; data: unknown };

export type EmailBlocksValidation =
  | { ok: true; blocks: EmailBlockInstance[] }
  | { ok: false; message: string; index: number };

/** Validates every block's data against its real schema and returns the parsed (defaults-filled) blocks. */
export function validateEmailBlocks(input: unknown): EmailBlocksValidation {
  if (!Array.isArray(input)) return { ok: false, message: "Blocks must be a list.", index: -1 };
  const blocks: EmailBlockInstance[] = [];
  for (const [index, raw] of input.entries()) {
    const type = (raw as { type?: unknown } | null)?.type;
    const definition = typeof type === "string" ? emailBlockRegistry[type] : undefined;
    if (!definition) return { ok: false, message: `Block ${index + 1} has an unknown type.`, index };
    const parsed = definition.schema.safeParse((raw as { data?: unknown }).data ?? {});
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path.length ? `${issue.path.join(" › ")}: ` : "";
      return { ok: false, message: `${definition.label} (block ${index + 1}) — ${field}${issue?.message ?? "invalid"}`, index };
    }
    blocks.push({ type: definition.type, data: parsed.data });
  }
  return { ok: true, blocks };
}
