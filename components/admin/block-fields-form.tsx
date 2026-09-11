"use client";

import { FieldRenderer } from "@/components/admin/field-renderer";
import { COMMON_ADMIN_FIELDS, type FieldSpec } from "@/lib/blocks/admin-fields";

/**
 * Renders the full field set for one block instance: the common
 * background/spacing/anchor fields every block schema extends
 * (lib/blocks/common.ts), then the block's own `adminFields`. All fields
 * live flat under `namePrefix` (e.g. `blocks.3.data`) because
 * blockCommonSchema.extend(...) produces one flat object per block, which
 * is exactly what's stored in page_blocks.data — see BlockRenderer.
 *
 * Takes just `{ adminFields }` (not the full BlockDefinition) so callers
 * can pass either a real BlockDefinition or the client-safe
 * BlockPaletteEntry (lib/blocks/registry.ts) — BlockDefinition itself
 * carries a ZodType and Render component that aren't serializable to a
 * client component.
 */
export function BlockFieldsForm({
  definition,
  namePrefix,
}: {
  definition: { adminFields: FieldSpec[] };
  namePrefix: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {COMMON_ADMIN_FIELDS.map((spec) => (
          <FieldRenderer key={spec.key} spec={spec} name={`${namePrefix}.${spec.key}`} />
        ))}
      </div>
      <hr className="border-osi-sand-300" />
      <div className="space-y-4">
        {definition.adminFields.map((spec) => (
          <FieldRenderer key={spec.key} spec={spec} name={`${namePrefix}.${spec.key}`} />
        ))}
      </div>
    </div>
  );
}
