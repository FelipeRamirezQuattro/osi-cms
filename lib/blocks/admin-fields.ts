/**
 * Per-block admin form metadata, paired with (not derived from) each
 * block's Zod schema. Zod v4's internal shape changed enough between
 * major versions that deep runtime introspection (unwrapping
 * ZodOptional/ZodDefault/ZodEnum etc. to build a form) is a fragile
 * thing to rely on for 26 different schemas — a small hand-written
 * FieldSpec per block is more code up front but doesn't silently break
 * on a zod upgrade, and lets a field be more informative than a schema
 * alone can be (e.g. marking an `imageUrl` field for the media picker,
 * or `content` for the Tiptap editor). Validation still goes entirely
 * through the Zod schema (see BlockRenderer) — this is presentation
 * metadata only, always kept next to the schema it describes.
 */

export type FieldSpec =
  | { key: string; label: string; type: "text"; optional?: boolean }
  | { key: string; label: string; type: "textarea"; optional?: boolean }
  | { key: string; label: string; type: "number"; optional?: boolean }
  | { key: string; label: string; type: "boolean"; optional?: boolean }
  | { key: string; label: string; type: "select"; options: string[]; optional?: boolean }
  // `accept` distinguishes what MediaPicker should offer/filter for
  // (Task 11 — "generalize and harden the media library"): "image"
  // (default, unchanged behavior for every one of the ~32 existing
  // `image`-type fields that don't set it) or "file" for a document
  // (currently just PDF — see lib/validation/media.ts). "video" exists
  // in the type only, reserved for later — no field sets it and
  // MediaPicker doesn't render a video-specific picker yet; hosted video
  // isn't supported until file-size/bandwidth/provider limits are
  // defined (docs/DECISIONS.md), so this is deliberately inert for now,
  // not wired up. Bumping a field from "image" to "file" is additive and
  // backward-compatible — it does not require touching every other
  // caller of this union.
  | { key: string; label: string; type: "image"; accept?: "image" | "file" | "video" | "model"; optional?: boolean }
  | { key: string; label: string; type: "richtext"; optional?: boolean }
  | { key: string; label: string; type: "date"; optional?: boolean }
  // `relation` renders a <select> populated at runtime from a
  // RelationOptionsProvider (components/admin/relation-options.tsx),
  // keyed by `relation` — used by the simple-entity admin (lib/admin/
  // entity-config.ts) for foreign keys like directory_contacts.location_id.
  // Not used by any block — blocks don't reference other tables by id.
  | { key: string; label: string; type: "relation"; relation: string; optional?: boolean }
  // Checkbox list bound to an array of ids — the many-to-many equivalent
  // of `relation` (e.g. products.industries via product_industries).
  | { key: string; label: string; type: "multi-relation"; relation: string; optional?: boolean }
  | { key: string; label: string; type: "object"; fields: FieldSpec[]; optional?: boolean }
  | {
      key: string;
      label: string;
      type: "array";
      /** Omitted = array of plain text values, not array of objects. */
      itemFields?: FieldSpec[];
      optional?: boolean;
      minItems?: number;
      maxItems?: number;
    };

// Prepended to every block's own fields in the editor UI — matches
// blockCommonSchema (lib/blocks/common.ts).
export const COMMON_ADMIN_FIELDS: FieldSpec[] = [
  {
    key: "background",
    label: "Background",
    type: "select",
    options: ["navy", "cream", "transparent"],
  },
  { key: "spacingTop", label: "Spacing (top)", type: "select", options: ["sm", "md", "lg"] },
  { key: "spacingBottom", label: "Spacing (bottom)", type: "select", options: ["sm", "md", "lg"] },
  { key: "anchorId", label: "Anchor ID", type: "text", optional: true },
];

export const CTA_FIELDS: FieldSpec[] = [
  { key: "label", label: "Label", type: "text" },
  { key: "href", label: "Link", type: "text" },
];

export const LINK_FIELDS: FieldSpec[] = [
  { key: "label", label: "Label", type: "text" },
  { key: "href", label: "Link", type: "text" },
];
