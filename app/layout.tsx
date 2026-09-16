import type { Metadata } from "next";
import { siteUrl } from "@/lib/seo";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Odessa Separator Inc.", template: "%s | Odessa Separator Inc." },
  description: "World-class downhole fluid-conditioning systems.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <noscript>
          {/* Motion server-renders its "hidden" initial state as the
              inline style `opacity:0;transform:translateY(8px)`; with no
              JS nothing will ever animate it back in, so reveal it up
              front rather than leaving the page blank.

              This is deliberately narrower than a bare [style*="opacity:0"],
              which is a substring match and so also hits DuotoneImage's
              `opacity:0.35`/`0.5`/`0.55` navy mix-blend-multiply tint layer
              (and HairlineGrid's `opacity:0.15`) — forcing those to opacity
              1 turns every photograph into a solid navy block. Excluding
              anything with "opacity:0." rules out every fractional value
              while still matching both `opacity:0;transform:translateY(8px)`
              (the common case) and the bare `opacity:0` some motion.div
              instances emit when they animate opacity alone (e.g.
              stages-carousel-client.tsx's stage cross-fade, which has no
              transform to reset). A fractional value always has a `.`
              immediately after the leading `0`; neither hidden-state shape
              ever does. */}
          <style>{`[style*="opacity:0"]:not([style*="opacity:0."]){opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
