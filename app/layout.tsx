import type { Metadata } from "next";
import { Orbitron, Montserrat } from "next/font/google";
import { siteUrl } from "@/lib/seo";
import "./globals.css";

const orbitron = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

const montserrat = Montserrat({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "Odessa Separator Inc.", template: "%s | Odessa Separator Inc." },
  description: "World-class downhole fluid-conditioning systems.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${orbitron.variable} ${montserrat.variable} h-full antialiased`}>
      <head>
        <noscript>
          {/* Motion server-renders its "hidden" initial state as the
              inline style `opacity:0;transform:translateY(8px)`; with no
              JS nothing will ever animate it back in, so reveal it up
              front rather than leaving the page blank.

              Both selectors are deliberately narrower than a bare
              [style*="opacity:0"], which is a substring match and so
              also hits DuotoneImage's `opacity:0.35`/`0.5`/`0.55` navy
              mix-blend-multiply tint layer — forcing that to opacity 1
              turns every photograph into a solid navy block. Neither
              form below can: a fractional value never has a `;`
              immediately after the `0`, and the tint layer carries no
              transform at all. */}
          <style>
            {`[style*="translateY(8px)"],[style*="opacity:0;"]{opacity:1!important;transform:none!important}`}
          </style>
        </noscript>
      </head>
      <body className="flex min-h-full flex-col bg-osi-cream-100 font-body text-osi-navy-900">
        {children}
      </body>
    </html>
  );
}
