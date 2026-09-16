import {
  Fraunces,
  Inter,
  Montserrat,
  Orbitron,
  Poppins,
  Rajdhani,
  Source_Sans_3,
} from "next/font/google";
import type { FontCatalogKey } from "@/lib/fonts/catalog";

// Preloading is disabled because the selected families are request-time
// branding data. The browser requests only faces referenced by the compiled
// role variables; unused catalog families remain dormant @font-face rules.
const orbitron = Orbitron({
  variable: "--font-catalog-orbitron",
  subsets: ["latin"],
  weight: ["500", "700"],
  display: "swap",
  preload: false,
});

const montserrat = Montserrat({
  variable: "--font-catalog-montserrat",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  preload: false,
});

const poppins = Poppins({
  variable: "--font-catalog-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
});

const rajdhani = Rajdhani({
  variable: "--font-catalog-rajdhani",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
  preload: false,
});

const fraunces = Fraunces({
  variable: "--font-catalog-fraunces",
  subsets: ["latin"],
  weight: ["600"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

const sourceSans3 = Source_Sans_3({
  variable: "--font-catalog-source-sans-3",
  subsets: ["latin"],
  weight: ["400", "600"],
  display: "swap",
  preload: false,
});

const inter = Inter({
  variable: "--font-catalog-inter",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  preload: false,
});

const FONT_VARIABLE_CLASSES: Partial<Record<FontCatalogKey, string>> = {
  orbitron: orbitron.variable,
  montserrat: montserrat.variable,
  poppins: poppins.variable,
  rajdhani: rajdhani.variable,
  fraunces: fraunces.variable,
  "source-sans-3": sourceSans3.variable,
  inter: inter.variable,
};

export function getPublicFontVariableClassNames(keys: readonly FontCatalogKey[]): string {
  return [...new Set(keys)]
    .sort()
    .map((key) => FONT_VARIABLE_CLASSES[key])
    .filter((className): className is string => Boolean(className))
    .join(" ");
}
