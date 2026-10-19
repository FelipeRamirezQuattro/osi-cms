import type { ReactNode } from "react";
import { compileBrandingTheme } from "@/lib/branding/theme";
import type { ResolvedPublicBranding } from "@/lib/branding/resolve";
import { ForgeFontPreload } from "@/components/branding/forge-font-preload";
import { LayoutThemeProvider } from "@/components/branding/layout-theme-context";
import { getPublicFontVariableClassNames } from "@/lib/fonts/public-fonts";

export function PublicThemeBoundary({
  branding,
  children,
  className = "",
}: {
  branding: ResolvedPublicBranding;
  children: ReactNode;
  className?: string;
}) {
  const theme = compileBrandingTheme(branding.config);
  const fontClasses = getPublicFontVariableClassNames(theme.usedFontKeys);

  return (
    <div
      className={`public-site site-shell ${fontClasses} ${className}`.trim()}
      style={theme.style}
      data-theme={theme.layout}
      data-branding-source={theme.usedFallback ? "fallback" : branding.source}
      data-branding-version={
        theme.usedFallback ? undefined : (branding.publishedVersion ?? undefined)
      }
    >
      {theme.layout === "forge" && <ForgeFontPreload />}
      <LayoutThemeProvider layout={theme.layout}>{children}</LayoutThemeProvider>
    </div>
  );
}
