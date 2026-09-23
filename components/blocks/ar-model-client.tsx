"use client";

import { useEffect, useState } from "react";
import { Section } from "@/components/ui/section";
import { resolveMediaUrl } from "@/lib/media";
import { generateQrCodeSvg } from "@/lib/ar/qr";
import type { ArModelData } from "@/components/blocks/ar-model";

export function ArModelRender({ data }: { data: ArModelData }) {
  const [qrSvg, setQrSvg] = useState<string | null>(null);

  // @google/model-viewer registers a custom element via
  // customElements.define at module load time, which throws during SSR
  // (no `customElements` global server-side) — a dynamic import inside
  // an effect keeps it entirely client-side and out of the initial
  // bundle for every page that doesn't use this block.
  useEffect(() => {
    // Swallow a load failure rather than letting it surface as an
    // unhandled rejection — matters both for a real browser old enough
    // to lack custom-element support, and for the Vitest/jsdom test
    // environment in ar-model.test.tsx (jsdom implements
    // customElements but not the WebGL/canvas APIs model-viewer's
    // internals eventually touch).
    import("@google/model-viewer").catch(() => {});
  }, []);

  useEffect(() => {
    if (!data.glbUrl || !data.usdzUrl) return;
    let cancelled = false;
    generateQrCodeSvg(window.location.href).then((svg) => {
      if (!cancelled) setQrSvg(svg);
    });
    return () => {
      cancelled = true;
    };
  }, [data.glbUrl, data.usdzUrl]);

  // Both URLs are required by the schema (ar-model.tsx) before a save can
  // succeed — this guard is defensive only, matching every other media
  // block's "unset -> render nothing" convention (see video-embed.tsx).
  if (!data.glbUrl || !data.usdzUrl) return null;

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
    >
      {data.title && (
        <h2 className="mb-6 font-editorial text-section font-semibold text-balance">{data.title}</h2>
      )}
      <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-start">
        <model-viewer
          src={resolveMediaUrl(data.glbUrl)}
          ios-src={resolveMediaUrl(data.usdzUrl)}
          poster={data.posterUrl ? resolveMediaUrl(data.posterUrl) : undefined}
          alt={data.alt}
          ar
          ar-modes="webxr scene-viewer quick-look"
          camera-controls
          // auto-rotate is deliberately never set — CLAUDE.md's Motion
          // conventions rule out continuously-looping decorative motion;
          // orbiting the model is drag-driven only.
          className="aspect-square w-full rounded bg-osi-sand-100"
        />
        {qrSvg && (
          <div className="flex flex-col items-center gap-2 text-center text-xs">
            {/*
             * Safe: qrSvg is always generated from window.location.href
             * (this page's own URL, produced by generateQrCodeSvg in
             * lib/ar/qr.ts) — never third-party or user-supplied text.
             */}
            <div className="h-32 w-32" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <span className="opacity-70">Scan to view in AR</span>
          </div>
        )}
      </div>
      {data.caption && <p className="mt-3 text-sm opacity-70">{data.caption}</p>}
    </Section>
  );
}
