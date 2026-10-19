import type { ReactNode } from "react";
import { getBlockDefinition } from "@/lib/blocks/registry";
import type { BlockBackground } from "@/lib/blocks/common";
import { resolveBlockAppearanceStyle } from "@/lib/branding/block-appearance";

/**
 * Gives a block Render that is composed directly (not through BlockRenderer —
 * the fixed sections of a product page) the same wrapper BlockRenderer
 * provides: the `data-block-type` hook that theme styles key off, plus the
 * resolved `--block-*` appearance variables. Without those variables a
 * block's muted text falls back to its on-light colour even on a navy
 * background (slate on navy is only 3.07:1). `display: contents` keeps layout
 * untouched.
 */
export function BlockScope({
  type,
  background,
  children,
}: {
  type: string;
  background: BlockBackground;
  children: ReactNode;
}) {
  const capabilities = getBlockDefinition(type)?.appearance;
  const style = capabilities
    ? resolveBlockAppearanceStyle({ blockType: type, legacyBackground: background, appearance: undefined, capabilities }).style
    : undefined;
  return (
    <div className="brand-block contents" style={style} data-block-type={type} data-appearance-source="legacy">
      {children}
    </div>
  );
}
