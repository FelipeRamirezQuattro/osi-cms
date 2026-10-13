"use client";

import { useState } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { BlockFieldsForm } from "@/components/admin/block-fields-form";
import { BlockPalettePicker } from "@/components/admin/block-palette-picker";
import { ReorderButtons } from "@/components/admin/ui/row-actions";
import type { BlockPaletteEntry } from "@/lib/blocks/registry";

// The product form is one untyped RHF instance, same as page-editor.tsx.
/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The product editor's "Extra content blocks" section: the same blocks (and
 * the same fields form) as the page editor, for content the fixed product
 * structure can't hold — extra videos, image runs, comparison sections, a
 * second headed list. Rendered after the fixed sections on the public page.
 * Plain up/down reordering (no drag), which is all a handful of blocks needs.
 */
export function ProductBlocksField({ palette }: { palette: BlockPaletteEntry[] }) {
  const { control, setValue } = useFormContext<any>();
  const { fields, append, remove, move } = useFieldArray({ control, name: "blocks" });
  const watched: { type: string; is_visible: boolean }[] = useWatch({ control, name: "blocks" }) ?? [];
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const paletteByType = Object.fromEntries(palette.map((p) => [p.type, p]));

  function toggleOpen(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="space-y-3" aria-labelledby="product-blocks-heading">
      <div>
        <h2 id="product-blocks-heading" className="text-sm font-semibold">
          Extra content blocks
        </h2>
        <p className="text-xs text-[var(--admin-ink-secondary)]">
          Shown below the benefits, video and specs on the product page — use them for extra videos, images,
          comparison sections or a second list.
        </p>
      </div>

      {fields.length === 0 && <p className="text-xs text-[var(--admin-ink-secondary)]">No extra blocks yet.</p>}

      <ul className="space-y-2">
        {fields.map((field, index) => {
          const type = watched[index]?.type ?? (field as any).type;
          const definition = paletteByType[type];
          const label = definition?.label ?? type;
          const isVisible = watched[index]?.is_visible ?? true;
          const isOpen = openIds.has(field.id);
          return (
            <li key={field.id} data-block-row className="rounded border border-osi-sand-300 bg-osi-white">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2">
                <ReorderButtons
                  onMoveUp={() => move(index, index - 1)}
                  onMoveDown={() => move(index, index + 1)}
                  disableUp={index === 0}
                  disableDown={index === fields.length - 1}
                  itemLabel={label}
                />
                <button
                  type="button"
                  data-block-toggle
                  onClick={() => toggleOpen(field.id)}
                  aria-expanded={isOpen}
                  className="min-w-0 flex-1 basis-32 text-left text-sm font-medium"
                >
                  {label} {!isVisible && <span className="text-xs opacity-50">(hidden)</span>}
                </button>
                <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-1">
                  <button
                    type="button"
                    onClick={() => setValue(`blocks.${index}.is_visible`, !isVisible, { shouldDirty: true })}
                    className="min-h-8 text-xs opacity-70 hover:underline"
                  >
                    {isVisible ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="min-h-8 text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
              {isOpen && definition && (
                <div data-block-fields className="border-t border-osi-sand-300 p-4">
                  <BlockFieldsForm definition={definition} namePrefix={`blocks.${index}.data`} />
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <BlockPalettePicker
        entries={palette}
        onAdd={(entry) => append({ type: entry.type, is_visible: true, data: entry.defaults })}
      />
    </section>
  );
}
