import type { RelationOption } from "@/components/admin/relation-options";

/** Relation key the `shared_section` block's picker field reads its options from. */
export const SHARED_SECTIONS_RELATION = "shared-sections";

/**
 * Picker options for the shared_section block: each is a section's *key*
 * (what the block stores) labeled by its human title. Sections that aren't
 * published are still listed — so a block can be set up ahead of time — but
 * flagged, since they render nothing on the live site until published.
 */
export function sharedSectionOptions(
  sections: { key: string; title: string; status: string }[],
  excludeKey?: string,
): RelationOption[] {
  return sections
    .filter((s) => s.key !== excludeKey)
    .map((s) => ({
      value: s.key,
      label: s.status === "published" ? s.title : `${s.title} (draft — hidden until published)`,
    }));
}
