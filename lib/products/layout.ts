import { z } from "zod";

/**
 * A product page is an ordered list of rows in `product_blocks`. Most rows are
 * ordinary registry blocks; the "linked" ones below stand in for the fixed
 * product sections (benefits, stages, video, downloads, body, specs). A linked
 * row owns only its position, visibility and heading — the content still lives
 * in the product's own tables/fields and is edited in the product form — so
 * hiding or moving one never loses data, and it cannot be removed.
 *
 * A product with no linked rows renders the original fixed template
 * (DEFAULT_LINKED_ROWS, then its extra blocks), so nothing changes until a
 * layout is saved.
 */
export const LINKED_SECTION_TYPES = [
  "product_benefits",
  "product_stages",
  "product_video",
  "product_downloads",
  "product_body",
  "product_specs",
] as const;

export type LinkedSectionType = (typeof LINKED_SECTION_TYPES)[number];

export type LinkedSectionInfo = {
  label: string;
  /** Where the content of this section is edited in the product form. */
  editedIn: string;
  /** Heading shown by the original template. */
  defaultTitle: string;
  defaultBackground: "navy" | "cream";
};

export const LINKED_SECTIONS: Record<LinkedSectionType, LinkedSectionInfo> = {
  product_benefits: { label: "Benefits", editedIn: "the Benefits form below", defaultTitle: "Benefits", defaultBackground: "navy" },
  product_stages: { label: "Stages", editedIn: "the Stages form below", defaultTitle: "Stages", defaultBackground: "cream" },
  product_video: { label: "Video", editedIn: "the Video URL field in the product details", defaultTitle: "", defaultBackground: "cream" },
  product_downloads: {
    label: "Downloads (PDF + 3D)",
    editedIn: "the PDF and 3D model fields in the product details",
    defaultTitle: "How does it work?",
    defaultBackground: "navy",
  },
  product_body: { label: "Body text", editedIn: "the Body field in the product details", defaultTitle: "", defaultBackground: "cream" },
  product_specs: { label: "Specifications", editedIn: "the Specifications form below", defaultTitle: "Specifications", defaultBackground: "cream" },
};

export function isLinkedSectionType(type: string): type is LinkedSectionType {
  return (LINKED_SECTION_TYPES as readonly string[]).includes(type);
}

/** An empty `title` means "no heading"; a missing key is treated the same. */
export const linkedSectionDataSchema = z.object({
  title: z.string().optional(),
  background: z.enum(["navy", "cream"]).optional(),
  /** Video section only: the poster shown before play (default: the product diagram). */
  posterImageUrl: z.string().optional(),
});

export type LinkedSectionData = z.infer<typeof linkedSectionDataSchema>;

export type LayoutRow = { id?: string; type: string; is_visible: boolean; data: unknown };

export function defaultLinkedRows(): LayoutRow[] {
  return LINKED_SECTION_TYPES.map((type) => ({
    type,
    is_visible: true,
    data: { title: LINKED_SECTIONS[type].defaultTitle, background: LINKED_SECTIONS[type].defaultBackground },
  }));
}

export function hasLinkedRows(rows: readonly { type: string }[]): boolean {
  return rows.some((r) => isLinkedSectionType(r.type));
}

/** What the public page renders: the saved order, or the original template followed by the extras. */
export function resolveLayout<T extends LayoutRow>(rows: readonly T[]): (T | LayoutRow)[] {
  return hasLinkedRows(rows) ? [...rows] : [...defaultLinkedRows(), ...rows];
}

/**
 * What the editor shows: the same as `resolveLayout`, plus any linked section
 * a partially-migrated product is missing, appended so none can be lost.
 */
export function ensureLinkedRows<T extends LayoutRow>(rows: readonly T[]): (T | LayoutRow)[] {
  const resolved = resolveLayout(rows);
  const present = new Set(resolved.map((r) => r.type));
  const missing = defaultLinkedRows().filter((r) => !present.has(r.type));
  return [...resolved, ...missing];
}

/** Every linked section exactly once — what a save with any linked row must contain. */
export function missingLinkedSections(rows: readonly { type: string }[]): LinkedSectionType[] {
  if (!hasLinkedRows(rows)) return [];
  return LINKED_SECTION_TYPES.filter((t) => rows.filter((r) => r.type === t).length !== 1);
}
