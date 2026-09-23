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
    generateQrCodeSvg(window.location.href)
      .then((svg) => {
        if (!cancelled) setQrSvg(svg);
      })
      .catch(() => {});
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
          //
          // interaction-prompt="none" disables model-viewer's default
          // "auto" prompt, which starts an indefinitely looping wiggle
          // animation ~3s after load — the same looping-motion rule above,
          // and one this library has no prefers-reduced-motion support for
          // at all.
          interaction-prompt="none"
          // block (not the default inline display for an unknown custom
          // element) + explicit sizing utilities avoid a zero-height box
          // before @google/model-viewer's dynamic import upgrades the
          // element; touch-pan-y keeps a vertical swipe starting on the
          // model scrolling the page instead of orbiting it (model-viewer's
          // default touch-action: none traps mobile scroll otherwise).
          className="block aspect-square w-full touch-pan-y rounded bg-osi-sand-100"
        />
        {qrSvg && (
          <div className="flex flex-col items-center gap-2 text-center text-xs">
            {/*
             * Safe regardless of what window.location.href contains: qrcode's SVG
             * renderer never interpolates the input text into the output markup —
             * it only emits a <path d="..."> built from the computed QR matrix, so
             * no injected text can reach the DOM as markup.
             */}
            <div
              className="h-32 w-32 [&>svg]:h-full [&>svg]:w-full"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <span className="opacity-70">Scan to view in AR</span>
          </div>
        )}
      </div>
      {data.caption && <p className="mt-3 text-sm opacity-70">{data.caption}</p>}
    </Section>
  );
}
