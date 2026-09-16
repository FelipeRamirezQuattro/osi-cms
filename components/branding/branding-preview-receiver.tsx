"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { BrandingConfig } from "@/lib/branding/schema";
import { brandingConfigSchema } from "@/lib/branding/schema";
import { compileBrandingTheme } from "@/lib/branding/theme";

export const BRANDING_PREVIEW_MESSAGE = "osi-branding-preview-v1";

export function BrandingPreviewReceiver({ initialConfig }: { initialConfig: BrandingConfig }) {
  const [config, setConfig] = useState(initialConfig);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.origin !== window.location.origin || event.data?.type !== BRANDING_PREVIEW_MESSAGE) return;
      const parsed = brandingConfigSchema.safeParse(event.data.config);
      if (!parsed.success) return;
      setConfig(parsed.data);
      const candidate = event.data.logoUrl;
      if (typeof candidate !== "string" || candidate.length === 0) setLogoUrl(null);
      else {
        try {
          const url = new URL(candidate, window.location.origin);
          if (url.protocol === "https:" || url.origin === window.location.origin) setLogoUrl(url.href);
        } catch { setLogoUrl(null); }
      }
    }
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: `${BRANDING_PREVIEW_MESSAGE}-ready` }, window.location.origin);
    return () => window.removeEventListener("message", receive);
  }, []);

  const compiled = compileBrandingTheme(config);
  return (
    <div className="site-shell min-h-dvh" style={compiled.style}>
      <header className="flex min-h-18 items-center justify-between bg-brand-surface-dark px-6 text-brand-text-dark">
        <div className="font-display text-xl font-bold tracking-wide-display uppercase">{logoUrl ? <Image unoptimized src={logoUrl} alt={config.logo.altText} width={180} height={48} className="h-8 w-auto max-w-48 object-contain" /> : <>OSI<span className="text-brand-accent-dark">.</span></>}</div>
        <span className="font-label text-sm">Products&nbsp;&nbsp; Resources&nbsp;&nbsp; Contact</span>
      </header>
      <main>
        <section className="bg-brand-surface-dark px-6 py-20 text-brand-text-dark">
          <p className="font-label text-xs font-semibold tracking-wide-label text-brand-accent-dark uppercase">Representative hero</p>
          <h1 className="mt-3 max-w-3xl font-display text-hero leading-tight">Engineered performance for demanding fields.</h1>
          <p className="mt-5 max-w-xl font-body opacity-80">Review the draft identity at a realistic scale before it reaches the public site.</p>
          <button className="mt-7 rounded-full bg-brand-accent-dark px-5 py-3 font-label text-sm font-semibold text-brand-primary">Explore solutions</button>
        </section>
        <section className="bg-brand-surface-light px-6 py-16 text-brand-text-light">
          <p className="font-label text-xs font-semibold tracking-wide-label text-brand-accent-light uppercase">Content surface</p>
          <h2 className="mt-3 font-editorial text-3xl font-semibold">Clarity from headline to detail</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">{["Products", "Resources", "Field support"].map((label) => <article key={label} className="rounded-xl border border-[var(--brand-color-border-on-light)] p-5"><h3 className="font-editorial text-lg font-semibold">{label}</h3><p className="mt-2 font-body text-sm text-[var(--brand-color-muted-text-on-light)]">A compact card for checking body copy, borders, and hierarchy.</p></article>)}</div>
        </section>
      </main>
      <footer className="bg-brand-surface-dark px-6 py-10 font-body text-sm text-brand-text-dark">Odessa Separator Inc. · Brand preview</footer>
    </div>
  );
}
