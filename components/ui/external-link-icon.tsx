/**
 * Visual "opens in a new tab" indicator for a nav item flagged
 * `is_external` (nav_items.is_external) — paired with
 * lib/routes.ts's externalLinkAttrs. No icon library exists in this repo
 * (see CLAUDE.md's stack list); a plain glyph matches the codebase's
 * existing convention of inline unicode symbols for small UI affordances
 * (the header's "✕" close button, ArrowButton's "→", the block editor's
 * "⠿" drag handle) rather than pulling in a dependency for one glyph.
 */
export function ExternalLinkIcon({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`inline-block ${className}`}>
      ↗
    </span>
  );
}
