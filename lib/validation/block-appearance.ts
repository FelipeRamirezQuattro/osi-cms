import type { BrandingConfig } from "@/lib/branding/schema";
import type { BlockValidationInput, BlockValidationError } from "@/lib/validation/blocks";
import { getBlockDefinition } from "@/lib/blocks/registry";
import { blockAppearanceSchema } from "@/lib/blocks/common";
import { getFontCatalogEntry } from "@/lib/fonts/catalog";

/** Enforces that ordinary editors can persist only currently-published choices. */
export function validateBlockAppearanceReferences(
  blocks: BlockValidationInput[],
  branding: BrandingConfig,
): BlockValidationError | null {
  const presetIds = new Set(branding.surfacePresets.map((preset) => preset.id));
  const swatchIds = new Set(branding.swatches.map((swatch) => swatch.id));

  for (let index = 0; index < blocks.length; index++) {
    const raw = blocks[index].data.appearance;
    if (raw === undefined) continue;
    const parsed = blockAppearanceSchema.safeParse(raw);
    if (!parsed.success) return { status: "error", message: `Block ${index + 1}: invalid appearance settings.`, blockIndex: index, field: "appearance" };
    const definition = getBlockDefinition(blocks[index].type);
    if (!definition?.appearance) continue;
    const appearance = parsed.data;
    if (!definition.appearance.surface && appearance.surfacePresetId) return { status: "error", message: `Block ${index + 1} does not support a surface override.`, blockIndex: index, field: "appearance.surfacePresetId" };
    if (appearance.surfacePresetId && !presetIds.has(appearance.surfacePresetId)) return { status: "error", message: `Block ${index + 1} references a surface that is not published.`, blockIndex: index, field: "appearance.surfacePresetId" };
    if (!definition.appearance.accent && appearance.accentSwatchId) return { status: "error", message: `Block ${index + 1} does not support an accent override.`, blockIndex: index, field: "appearance.accentSwatchId" };
    if (appearance.accentSwatchId && !swatchIds.has(appearance.accentSwatchId)) return { status: "error", message: `Block ${index + 1} references a color that is not published.`, blockIndex: index, field: "appearance.accentSwatchId" };
    for (const [slot, font] of Object.entries(appearance.typography ?? {})) {
      if (!font) continue;
      if (!definition.appearance.typography.includes(slot as never)) return { status: "error", message: `Block ${index + 1} does not support a ${slot} font override.`, blockIndex: index, field: `appearance.typography.${slot}` };
      const catalogEntry = getFontCatalogEntry(font);
      if (!catalogEntry || catalogEntry.status !== "available") return { status: "error", message: `Block ${index + 1} references a font that is not published.`, blockIndex: index, field: `appearance.typography.${slot}` };
      if (!(catalogEntry.allowedRoles as readonly string[]).includes(slot)) return { status: "error", message: `Block ${index + 1}: this font does not support the ${slot} role.`, blockIndex: index, field: `appearance.typography.${slot}` };
    }
  }
  return null;
}
