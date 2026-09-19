import type { Metadata } from "next";
import { getPublicFontVariableClassNames } from "@/lib/fonts/public-fonts";
import "@/prototypes/osi-theme-showcase/showcase.css";

export const metadata: Metadata = {
  title: "OSI Theme Comparison",
  description: "Isolated visual direction prototype for Odessa Separator Inc.",
  robots: { index: false, follow: false },
};

const fontClasses = getPublicFontVariableClassNames([
  "orbitron",
  "montserrat",
  "poppins",
  "rajdhani",
  "fraunces",
  "source-sans-3",
]);

export default function ThemePrototypeLayout({ children }: { children: React.ReactNode }) {
  return <div className={`osi-theme-prototype ${fontClasses}`}>{children}</div>;
}
