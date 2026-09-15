"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Section } from "@/components/ui/section";
import { DuotoneImage } from "@/components/ui/duotone-image";
import { EASE_OSI } from "@/lib/motion/variants";
import type { StagesCarouselData } from "@/components/blocks/stages-carousel";

export function StagesCarouselRender({ data }: { data: StagesCarouselData }) {
  const [index, setIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const stage = data.stages[index];
  if (!stage) return null;

  function move(direction: -1 | 1) {
    setIndex((current) => (current + direction + data.stages.length) % data.stages.length);
  }

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
    >
      <h2 className="mb-8 font-editorial text-section font-semibold text-balance">{data.title}</h2>
      <motion.div
        key={index}
        role="group"
        aria-roledescription="carousel"
        aria-label={`${data.title}: ${stage.title}, stage ${index + 1} of ${data.stages.length}`}
        tabIndex={0}
        className="grid cursor-grab gap-8 rounded-[var(--site-radius-lg)] border border-[var(--site-border)] bg-[var(--site-surface-raised)] p-6 text-osi-navy-900 active:cursor-grabbing sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center md:p-8"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: EASE_OSI }}
        drag={reduceMotion || data.stages.length < 2 ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.12}
        dragMomentum={false}
        style={{ touchAction: "pan-y" }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -44) move(1);
          if (info.offset.x > 44) move(-1);
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            move(-1);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            move(1);
          }
        }}
      >
        <DuotoneImage
          src={stage.imageUrl}
          alt={stage.imageUrl ? stage.title : ""}
          className="aspect-square w-full rounded-[var(--site-radius-md)]"
          intensity={0.2}
          sizes="(min-width: 640px) 10rem, 100vw"
        />
        <div>
          <p
            className={`font-display text-small-label tracking-wide-label uppercase ${
              data.background === "cream" ? "text-osi-gold-700" : "text-osi-gold-500"
            }`}
          >
            Stage {index + 1} of {data.stages.length}
          </p>
          <h3 className="mt-1 font-editorial text-2xl font-semibold leading-tight text-balance">
            {stage.title}
          </h3>
          {stage.body && <p className="mt-3 max-w-xl text-sm leading-relaxed text-osi-slate-300">{stage.body}</p>}
        </div>
      </motion.div>
      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-sm text-osi-slate-300" aria-live="polite">{stage.title}</p>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Previous stage"
            onClick={() => move(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-current/25 transition-[background-color,transform] duration-200 hover:bg-current/8 active:scale-[0.98]"
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            aria-label="Next stage"
            onClick={() => move(1)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-current/25 transition-[background-color,transform] duration-200 hover:bg-current/8 active:scale-[0.98]"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </Section>
  );
}
