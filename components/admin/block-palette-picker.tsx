"use client";

import { useMemo, useState } from "react";
import type { BlockPaletteEntry } from "@/lib/blocks/registry";
import { filterBySearch } from "@/lib/admin/list-query";

/**
 * The searchable, categorized "Add a block" picker (Task 13a) —
 * replaces the plain `<select>`/`<optgroup>` page-editor.tsx carried since
 * Task 9 (see that file's removed comment: "not a redesigned/searchable
 * picker... a full picker UI overhaul is a later task's scope" — this is
 * that task).
 *
 * "Thumbnail" and "common use" (brief item 3) are satisfied without any
 * new image asset: every block's `description` (lib/blocks/registry.ts)
 * already ends with a "— use for ..." clause written for exactly this
 * purpose (see e.g. hero-full.tsx, cta-band.tsx), and each card gets a
 * lightweight lettered swatch keyed by `category` in place of a real
 * thumbnail image — there is no thumbnail/icon asset system anywhere in
 * this codebase's block registry to draw a real image from (see
 * docs/DECISIONS.md, Task 13a). Clicking a card adds that block
 * immediately — no separate two-step select-then-click.
 */
const CATEGORY_ORDER: BlockPaletteEntry["category"][] = ["hero", "content", "commerce", "media", "forms", "layout"];

const CATEGORY_LABELS: Record<BlockPaletteEntry["category"], string> = {
  hero: "Hero",
  content: "Content",
  commerce: "Commerce",
  media: "Media",
  forms: "Forms",
  layout: "Layout",
};

const CATEGORY_LETTERS: Record<BlockPaletteEntry["category"], string> = {
  hero: "H",
  content: "C",
  commerce: "$",
  media: "M",
  forms: "F",
  layout: "L",
};

function CategorySwatch({ category }: { category: BlockPaletteEntry["category"] }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-osi-navy-900 font-display text-sm text-osi-cream-100"
    >
      {CATEGORY_LETTERS[category]}
    </span>
  );
}

export function BlockPalettePicker({
  entries,
  onAdd,
}: {
  entries: BlockPaletteEntry[];
  onAdd: (entry: BlockPaletteEntry) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () => filterBySearch(entries, query, (entry) => `${entry.label} ${entry.description} ${entry.category}`),
    [entries, query],
  );

  const categoriesPresent = CATEGORY_ORDER.filter((category) => filtered.some((entry) => entry.category === category));

  return (
    <div className="rounded border border-osi-sand-300 bg-osi-white p-3">
      <label className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide-label opacity-60">Add a block</span>
        <input
          type="search"
          inputMode="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search blocks by name or purpose…"
          className="rounded border border-osi-sand-300 px-3 py-2 text-sm"
        />
      </label>

      <div className="mt-3 max-h-80 space-y-4 overflow-y-auto pr-1">
        {categoriesPresent.map((category) => (
          <div key={category}>
            <p className="mb-1.5 text-[10px] uppercase tracking-wide-label opacity-50">{CATEGORY_LABELS[category]}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {filtered
                .filter((entry) => entry.category === category)
                .map((entry) => (
                  <button
                    key={entry.type}
                    type="button"
                    onClick={() => onAdd(entry)}
                    className="flex items-start gap-2 rounded border border-osi-sand-300 p-2 text-left hover:border-osi-navy-900"
                  >
                    <CategorySwatch category={entry.category} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{entry.label}</span>
                      <span className="block text-xs text-osi-slate-400">{entry.description}</span>
                    </span>
                  </button>
                ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="py-4 text-center text-xs text-osi-slate-400">{`No blocks match "${query}".`}</p>
        )}
      </div>
    </div>
  );
}
