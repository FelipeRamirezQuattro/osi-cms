/**
 * Builds the accessible name for a Move-up/Move-down control. A bare
 * "Move up"/"Move down" is fine when there's only ever one such button
 * pair on the page, but every reorderable admin list (page/shared-section
 * blocks, products, generic entities, array-field items) repeats
 * `ReorderButtons` once per row — a page with a dozen blocks then has a
 * dozen buttons all announced as the identical "Move up" to a screen
 * reader user tabbing/browsing by name, with no way to tell them apart
 * without also reading surrounding context. Folding the row's own label
 * (a block's type label, a product's name, an entity row's primary
 * column, an array item's position) into the name fixes that directly,
 * at the one place every caller already funnels through.
 */
export function reorderAriaLabel(direction: "up" | "down", itemLabel?: string): string {
  const verb = direction === "up" ? "Move up" : "Move down";
  const trimmed = itemLabel?.trim();
  return trimmed ? `Move ${trimmed} ${direction}` : verb;
}
