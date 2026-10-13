import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { getPublishedSharedSectionByKey } from "@/lib/data/shared-sections";
import type { FieldSpec } from "@/lib/blocks/admin-fields";
import type { BlockRenderExtras } from "@/lib/blocks/types";
import { SHARED_SECTIONS_RELATION } from "@/lib/admin/shared-section-options";
import { PreviewPlaceholder } from "@/components/blocks/preview-placeholder";

// Extends blockCommonSchema like every other block (COMMON_ADMIN_FIELDS is
// always rendered for every block instance in the editor — see
// BlockFieldsForm), but `background`/`spacingTop`/`spacingBottom` are
// inert here on purpose: this block only splices in another shared
// section's own blocks, which each carry their own background/spacing —
// wrapping them in a second Section would double up backgrounds and
// padding. Only `anchorId` is actually honored below.
const schema = blockCommonSchema.extend({
  key: z.string().trim().min(1, "Shared section key is required"),
});

export type SharedSectionBlockData = z.infer<typeof schema>;

const adminFields: FieldSpec[] = [
  { key: "key", label: "Shared section", type: "relation", relation: SHARED_SECTIONS_RELATION, optional: true },
];

/**
 * Task 10: at most this many levels of shared_section nesting (a page's
 * shared_section block counts as depth 1; a shared_section referenced
 * from *inside* another shared_section is depth 2) — controller ruling
 * #2 calls for "a small maximum nesting depth" and gives 2 as reasonable.
 * Anything deeper is refused rather than rendered, same failure mode as
 * an unknown block type.
 */
export const MAX_SHARED_SECTION_DEPTH = 2;

function DevDiagnostic({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") return null;
  return <div className="bg-red-600 p-4 font-mono text-sm text-white">{children}</div>;
}

export async function SharedSectionBlockRender({
  data,
  visitedSharedSectionKeys,
  sharedSectionDepth = 0,
  isPreview = false,
}: { data: SharedSectionBlockData } & BlockRenderExtras) {
  // Staff preview explains why nothing shows; the public site and dev
  // builds keep their existing behavior (nothing / red dev diagnostic).
  const diagnose = (message: string) =>
    isPreview ? <PreviewPlaceholder title="Shared section not shown">{message}</PreviewPlaceholder> : <DevDiagnostic>{message}</DevDiagnostic>;

  const visited = visitedSharedSectionKeys ?? new Set<string>();

  if (sharedSectionDepth >= MAX_SHARED_SECTION_DEPTH) {
    return diagnose(`Shared section "${data.key}" skipped — maximum nesting depth (${MAX_SHARED_SECTION_DEPTH}) reached.`);
  }

  if (visited.has(data.key)) {
    return diagnose(`Shared section "${data.key}" skipped — circular reference detected.`);
  }

  const section = await getPublishedSharedSectionByKey(data.key);
  if (!section) {
    return diagnose(`Shared section "${data.key}" not found or not published.`);
  }

  const nextVisited = new Set(visited);
  nextVisited.add(data.key);

  // Dynamic import, deliberately: registry.ts must statically import
  // every block file (including this one) to register it, and this is
  // the one block, uniquely, that needs to render OTHER registered
  // blocks recursively — a static import of block-renderer.tsx here
  // would close a registry.ts <-> shared-section.tsx <-> block-renderer.tsx
  // cycle. Deferring the import to call time breaks it; every other
  // import in this file stays static.
  const { BlockRenderer } = await import("@/components/blocks/block-renderer");
  const content = (
    <BlockRenderer
      blocks={section.blocks}
      visitedSharedSectionKeys={nextVisited}
      sharedSectionDepth={sharedSectionDepth + 1}
      isPreview={isPreview}
    />
  );

  return data.anchorId ? <div id={data.anchorId}>{content}</div> : content;
}

export const sharedSectionBlock = defineBlock({
  type: "shared_section",
  label: "Shared section",
  category: "layout",
  description:
    "Renders a published reusable section (built once in Admin → Shared sections) by its key — use for content repeated across multiple pages (e.g. a footer CTA). Editing the shared section's own blocks and publishing it updates every page that references it.",
  schema,
  adminFields,
  defaults: { background: "transparent", spacingTop: "md", spacingBottom: "md", key: "" },
  Render: SharedSectionBlockRender,
});
