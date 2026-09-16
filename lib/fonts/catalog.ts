export const TYPOGRAPHY_SLOTS = ["display", "heading", "body", "label"] as const;
export type TypographySlot = (typeof TYPOGRAPHY_SLOTS)[number];

export type FontCatalogStatus = "available" | "deprecated" | "unavailable";

export type FontCatalogEntry = {
  key: string;
  family: string;
  fallbackStack: string;
  source: string;
  license: string;
  weights: readonly string[];
  styles: readonly ("normal" | "italic")[];
  subsets: readonly string[];
  allowedRoles: readonly TypographySlot[];
  loadingStrategy: "next-font" | "system";
  cssVariable: `--font-catalog-${string}` | null;
  sample: string;
  status: FontCatalogStatus;
};

/**
 * The vetted, code-owned font catalog. Persisted branding stores only
 * these stable keys; family stacks and loading details never come from CMS
 * content. Web fonts are self-hosted by next/font at build time.
 */
export const FONT_CATALOG = [
  {
    key: "orbitron",
    family: "Orbitron",
    fallbackStack: "sans-serif",
    source: "Google Fonts",
    license: "SIL Open Font License 1.1",
    weights: ["500", "700"],
    styles: ["normal"],
    subsets: ["latin"],
    allowedRoles: ["display"],
    loadingStrategy: "next-font",
    cssVariable: "--font-catalog-orbitron",
    sample: "ENGINEERED PERFORMANCE 0123456789",
    status: "available",
  },
  {
    key: "montserrat",
    family: "Montserrat",
    fallbackStack: "sans-serif",
    source: "Google Fonts",
    license: "SIL Open Font License 1.1",
    weights: ["500", "600"],
    styles: ["normal"],
    subsets: ["latin"],
    allowedRoles: ["heading"],
    loadingStrategy: "next-font",
    cssVariable: "--font-catalog-montserrat",
    sample: "Reliable separation for demanding wells",
    status: "available",
  },
  {
    key: "poppins",
    family: "Poppins",
    fallbackStack: "sans-serif",
    source: "Google Fonts",
    license: "SIL Open Font License 1.1",
    weights: ["400", "500", "600"],
    styles: ["normal"],
    subsets: ["latin"],
    allowedRoles: ["body", "label"],
    loadingStrategy: "next-font",
    cssVariable: "--font-catalog-poppins",
    sample: "Clear technical information for every field team.",
    status: "available",
  },
  {
    key: "rajdhani",
    family: "Rajdhani",
    fallbackStack: "sans-serif",
    source: "Google Fonts",
    license: "SIL Open Font License 1.1",
    weights: ["500", "600", "700"],
    styles: ["normal"],
    subsets: ["latin"],
    allowedRoles: ["display", "heading"],
    loadingStrategy: "next-font",
    cssVariable: "--font-catalog-rajdhani",
    sample: "DOWNHOLE SYSTEMS 0123456789",
    status: "available",
  },
  {
    key: "fraunces",
    family: "Fraunces",
    fallbackStack: "serif",
    source: "Google Fonts",
    license: "SIL Open Font License 1.1",
    weights: ["600"],
    styles: ["normal", "italic"],
    subsets: ["latin"],
    allowedRoles: ["heading", "display"],
    loadingStrategy: "next-font",
    cssVariable: "--font-catalog-fraunces",
    sample: "Engineering experience, expressed with clarity",
    status: "available",
  },
  {
    key: "source-sans-3",
    family: "Source Sans 3",
    fallbackStack: "sans-serif",
    source: "Google Fonts",
    license: "SIL Open Font License 1.1",
    weights: ["400", "600"],
    styles: ["normal"],
    subsets: ["latin"],
    allowedRoles: ["body", "label"],
    loadingStrategy: "next-font",
    cssVariable: "--font-catalog-source-sans-3",
    sample: "Readable specifications and operating guidance.",
    status: "available",
  },
  {
    key: "inter",
    family: "Inter",
    fallbackStack: "sans-serif",
    source: "Google Fonts",
    license: "SIL Open Font License 1.1",
    weights: ["500", "600"],
    styles: ["normal"],
    subsets: ["latin"],
    allowedRoles: ["heading", "body", "label"],
    loadingStrategy: "next-font",
    cssVariable: "--font-catalog-inter",
    sample: "A neutral interface and editorial workhorse.",
    status: "available",
  },
  {
    key: "system-sans",
    family: "System Sans",
    fallbackStack:
      'ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    source: "Operating system",
    license: "Provided by the visitor's operating system",
    weights: ["400", "500", "600", "700"],
    styles: ["normal", "italic"],
    subsets: ["system-dependent"],
    allowedRoles: ["heading", "body", "label"],
    loadingStrategy: "system",
    cssVariable: null,
    sample: "Fast, familiar, and available without a font request.",
    status: "available",
  },
  {
    key: "system-serif",
    family: "System Serif",
    fallbackStack: 'ui-serif, Georgia, Cambria, "Times New Roman", serif',
    source: "Operating system",
    license: "Provided by the visitor's operating system",
    weights: ["400", "600", "700"],
    styles: ["normal", "italic"],
    subsets: ["system-dependent"],
    allowedRoles: ["heading", "display"],
    loadingStrategy: "system",
    cssVariable: null,
    sample: "A durable editorial serif fallback",
    status: "available",
  },
] as const satisfies readonly FontCatalogEntry[];

export type FontCatalogKey = (typeof FONT_CATALOG)[number]["key"];

export const FONT_CATALOG_KEYS = FONT_CATALOG.map((entry) => entry.key) as [
  FontCatalogKey,
  ...FontCatalogKey[],
];

export function getFontCatalogEntry(key: string) {
  return FONT_CATALOG.find((entry) => entry.key === key);
}

/** Returns a code-owned CSS stack for a validated catalog key. */
export function getFontCssStack(key: FontCatalogKey): string {
  const entry = getFontCatalogEntry(key);
  if (!entry) return FONT_CATALOG.find((font) => font.key === "system-sans")!.fallbackStack;
  if (entry.loadingStrategy === "system" || !entry.cssVariable) return entry.fallbackStack;
  return `var(${entry.cssVariable}), ${entry.fallbackStack}`;
}
