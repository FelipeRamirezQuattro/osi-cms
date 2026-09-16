"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { BrandingConfig } from "@/lib/branding/schema";
import { BRANDING_PREVIEW_MESSAGE } from "@/components/branding/branding-preview-receiver";
import { Button } from "@/components/admin/ui/button";

const WIDTHS = { mobile: "375px", tablet: "768px", desktop: "100%" } as const;

export function BrandingPreviewFrame({
  draft,
  live,
  draftLogoUrl,
  liveLogoUrl,
}: {
  draft: BrandingConfig;
  live: BrandingConfig;
  draftLogoUrl: string | null;
  liveLogoUrl: string | null;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewport, setViewport] = useState<keyof typeof WIDTHS>("desktop");
  const [mode, setMode] = useState<"draft" | "live">("draft");
  const config = mode === "draft" ? draft : live;

  const send = useCallback(() => {
    const logoUrl = mode === "draft" ? draftLogoUrl : liveLogoUrl;
    iframeRef.current?.contentWindow?.postMessage(
      { type: BRANDING_PREVIEW_MESSAGE, config, logoUrl },
      window.location.origin,
    );
  }, [config, draftLogoUrl, liveLogoUrl, mode]);

  useEffect(() => {
    function ready(event: MessageEvent) { if (event.origin === window.location.origin && event.data?.type === `${BRANDING_PREVIEW_MESSAGE}-ready`) send(); }
    window.addEventListener("message", ready);
    send();
    return () => window.removeEventListener("message", ready);
  }, [send]);

  return (
    <section className="admin-card p-4 sm:p-5" aria-labelledby="branding-full-preview-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><h2 id="branding-full-preview-title" className="text-base font-semibold">Isolated site preview</h2><p className="text-xs text-[var(--admin-ink-secondary)]">Validated structured values only; admin styles cannot enter the frame.</p></div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Preview controls">
          {(["draft", "live"] as const).map((item) => <Button key={item} variant={mode === item ? "primary" : "ghost"} className="min-h-8 px-3 text-xs" onClick={() => setMode(item)}>{item === "draft" ? "Draft" : "Live"}</Button>)}
          {(["mobile", "tablet", "desktop"] as const).map((item) => <Button key={item} variant={viewport === item ? "secondary" : "ghost"} className="min-h-8 px-3 text-xs capitalize" onClick={() => setViewport(item)}>{item}</Button>)}
        </div>
      </div>
      <div className="overflow-auto rounded-lg bg-[var(--admin-surface-muted)] p-2 sm:p-4">
        <iframe ref={iframeRef} src="/branding-preview" title={`${mode} branding preview at ${viewport} width`} onLoad={send} className="mx-auto block h-[640px] max-w-full rounded-md border border-[var(--admin-border)] bg-white shadow-sm" style={{ width: WIDTHS[viewport] }} />
      </div>
    </section>
  );
}
