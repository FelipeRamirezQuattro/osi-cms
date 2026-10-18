"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { LayoutTheme } from "@/lib/branding/schema";

const LayoutThemeContext = createContext<LayoutTheme>("classic");

/** Lets client motion primitives know the layout theme PublicThemeBoundary resolved (CSS reads data-theme instead). */
export function LayoutThemeProvider({ layout, children }: { layout: LayoutTheme; children: ReactNode }) {
  return <LayoutThemeContext.Provider value={layout}>{children}</LayoutThemeContext.Provider>;
}

export function useLayoutTheme(): LayoutTheme {
  return useContext(LayoutThemeContext);
}
