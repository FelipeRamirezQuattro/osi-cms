import type { Metadata } from "next";
import { Orbitron, Montserrat } from "next/font/google";
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
  title: "Odessa Separator Inc.",
  description: "World-class downhole fluid-conditioning systems.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${orbitron.variable} ${montserrat.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-osi-cream-100 font-body text-osi-navy-900">
        {children}
      </body>
    </html>
  );
}
