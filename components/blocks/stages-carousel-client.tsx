"use client";

import { useState } from "react";
import { Section } from "@/components/ui/section";
import { DuotoneImage } from "@/components/ui/duotone-image";
import type { StagesCarouselData } from "@/components/blocks/stages-carousel";

export function StagesCarouselRender({ data }: { data: StagesCarouselData }) {
  const [index, setIndex] = useState(0);
  const stage = data.stages[index];
  if (!stage) return null;

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
    >
      <div className="flex flex-col items-center gap-8 sm:flex-row">
        <DuotoneImage
          src={stage.imageUrl}
          className="h-32 w-32 shrink-0 rounded-full"
          intensity={0.2}
        />
        <div>
          <p className="font-display text-small-label tracking-wide-label text-osi-gold-500 uppercase">
            {data.title} — {index + 1} of {data.stages.length}
          </p>
          <h3 className="mt-1 font-display text-card-label tracking-wide-display uppercase">
            {stage.title}
          </h3>
          {stage.body && <p className="mt-2 max-w-xl text-sm opacity-80">{stage.body}</p>}
        </div>
      </div>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          aria-label="Previous stage"
          onClick={() => setIndex((i) => (i - 1 + data.stages.length) % data.stages.length)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-current"
        >
          ←
        </button>
        <button
          type="button"
          aria-label="Next stage"
          onClick={() => setIndex((i) => (i + 1) % data.stages.length)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-current"
        >
          →
        </button>
      </div>
    </Section>
  );
}
