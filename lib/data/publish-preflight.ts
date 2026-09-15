import { getBlockDefinition } from "@/lib/blocks/registry";
import { buildKnownPathSet, extractInternalLinkCandidates, findBrokenPaths } from "@/lib/data/link-audit";
import { listMediaAssetsByUrls } from "@/lib/data/media";
import { validateAltRequirement } from "@/lib/validation/media";
import {
  extractImageUrlsFromBlocks,
  runSyncPreflightChecks,
  type PreflightBlockInput,
  type PreflightSummary,
  type PreflightWarning,
} from "@/lib/validation/preflight";

/**
 * Task 15's publish preflight, assembled server-side (this file, not
 * lib/validation/preflight.ts, since broken-link and missing-media
 * checks both need a database round trip). Called from
 * lib/actions/pages.ts's runPagePreflightAction, itself called from the
 * page editor before Publish.
 *
 * Every check here is deliberately a *warning* except invalid block
 * data, which is a hard error — matching validateBlockList's existing
 * save-time behavior (see that function's own doc comment) rather than
 * introducing a second, parallel notion of "invalid". The page editor
 * shows warnings in a dismissible banner and still lets the editor
 * publish through them; an error here means Publish will also fail at
 * the saveDraft step that always runs first, so it's surfaced early
 * rather than making the editor click Publish to discover it.
 */
export async function runPagePreflight(blocks: PreflightBlockInput[]): Promise<PreflightSummary> {
  const errors: PreflightWarning[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const definition = getBlockDefinition(blocks[i].type);
    if (!definition) {
      errors.push({ code: "invalid_block", blockIndex: i, message: `Block ${i + 1}: unknown block type "${blocks[i].type}".` });
      continue;
    }
    const parsed = definition.schema.safeParse(blocks[i].data);
    if (!parsed.success) {
      errors.push({
        code: "invalid_block",
        blockIndex: i,
        message: `Block ${i + 1} (${definition.label}): ${parsed.error.issues[0]?.message ?? "invalid data."}`,
      });
    }
  }

  const warnings: PreflightWarning[] = [...runSyncPreflightChecks(blocks)];

  // Missing category/routes / broken internal references.
  const knownPaths = await buildKnownPathSet();
  blocks.forEach((block, index) => {
    const broken = findBrokenPaths(extractInternalLinkCandidates(block.data), knownPaths);
    for (const href of broken) {
      warnings.push({
        code: "broken_link",
        blockIndex: index,
        message: `Block ${index + 1} (${block.type}) links to "${href}", which doesn't resolve to any known page, product, or route.`,
      });
    }
  });

  // Missing media metadata (alt text) on tracked uploads referenced by this page.
  const imageUrls = extractImageUrlsFromBlocks(blocks);
  const assets = await listMediaAssetsByUrls(imageUrls);
  for (const asset of assets) {
    if (validateAltRequirement("image", asset.alt ?? "", asset.decorative)) {
      warnings.push({
        code: "missing_alt",
        message: `Image ${asset.url} is missing alt text (and isn't marked decorative) — edit it in the media library.`,
      });
    }
  }

  return { errors, warnings };
}
