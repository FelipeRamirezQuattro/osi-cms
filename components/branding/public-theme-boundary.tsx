import type { ReactNode } from "react";
import { compileBrandingTheme } from "@/lib/branding/theme";
import type { ResolvedPublicBranding } from "@/lib/branding/resolve";
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
      data-branding-source={theme.usedFallback ? "fallback" : branding.source}
      data-branding-version={
        theme.usedFallback ? undefined : (branding.publishedVersion ?? undefined)
      }
    >
      {children}
    </div>
  );
}
