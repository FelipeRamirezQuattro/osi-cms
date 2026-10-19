import { preload } from "react-dom";

/** Self-hosted Rajdhani 700 (latin) — the face every Forge display heading uses. See app/forge.css. */
export const FORGE_DISPLAY_FONT_URL = "/fonts/rajdhani-700-latin.woff2";

/**
 * Preloads Forge's display face so the first paint already has it. Rendered by
 * PublicThemeBoundary only when layout = "forge".
 *
 * Why not next/font's own `preload`: Next decides font preloads from the
 * module graph at build time, per route — a font module imported anywhere in
 * the public layout is hinted on EVERY page, classic included (verified: a
 * dynamic import still leaks the hint into classic's flight payload). A
 * stable public URL plus react-dom's runtime `preload()` is the one way to
 * make the preload depend on the resolved branding.
 */
export function ForgeFontPreload() {
  preload(FORGE_DISPLAY_FONT_URL, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return null;
}
