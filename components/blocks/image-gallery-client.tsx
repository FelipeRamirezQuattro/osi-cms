"use client";

import Image from "next/image";
import { useId, useRef, useState } from "react";
import type { RefObject } from "react";
import { IconButton } from "@/components/ui/public-primitives";

export type GalleryImage = {
  url: string;
  alt?: string;
};

function useLightbox(images: GalleryImage[]) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  function open(index: number, trigger: HTMLButtonElement) {
    setSelectedIndex(index);
    setIsOpen(true);
    triggerRef.current = trigger;
    dialogRef.current?.showModal();
  }

  function restoreTriggerFocus() {
    setIsOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function close() {
    dialogRef.current?.close();
    restoreTriggerFocus();
  }

  function move(direction: -1 | 1) {
    setSelectedIndex((current) => (current + direction + images.length) % images.length);
  }

  return { dialogRef, selectedIndex, isOpen, open, close, move, restoreTriggerFocus };
}

function LightboxDialog({
  images,
  dialogRef,
  selectedIndex,
  isOpen,
  close,
  move,
  restoreTriggerFocus,
}: {
  images: GalleryImage[];
  dialogRef: RefObject<HTMLDialogElement | null>;
  selectedIndex: number;
  isOpen: boolean;
  close: () => void;
  move: (direction: -1 | 1) => void;
  restoreTriggerFocus: () => void;
}) {
  const titleId = useId();
  const selected = images[selectedIndex];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="site-dialog site-lightbox bg-transparent p-0 text-white backdrop:bg-osi-navy-900/88"
      onClose={restoreTriggerFocus}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      onKeyDown={(event) => {
        if (images.length < 2) return;
        if (event.key === "ArrowLeft") move(-1);
        if (event.key === "ArrowRight") move(1);
      }}
    >
      <h2 id={titleId} className="sr-only">Image gallery</h2>
      {isOpen && selected && (
        <div className="flex h-full flex-col gap-3 rounded-[var(--site-radius-lg)] border border-white/20 bg-osi-navy-900 p-3 shadow-2xl sm:p-4">
          <div className="flex items-center justify-between gap-4 px-1">
            <p className="min-w-0 truncate text-sm text-white/82" aria-live="polite">
              {selected.alt || `Image ${selectedIndex + 1}`} · {selectedIndex + 1} of {images.length}
            </p>
            <IconButton label="Close gallery" onClick={close} className="shrink-0 border-white/25 text-white">
              <span aria-hidden="true" className="text-xl leading-none">×</span>
            </IconButton>
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-[var(--site-radius-md)] bg-black/25">
            <Image
              key={selected.url}
              src={selected.url}
              alt={selected.alt ?? ""}
              fill
              sizes="96vw"
              className="object-contain"
            />
          </div>
          {images.length > 1 && (
            <div className="flex justify-end gap-2">
              <IconButton label="Previous image" onClick={() => move(-1)} className="border-white/25 text-white">
                <span aria-hidden="true">←</span>
              </IconButton>
              <IconButton label="Next image" onClick={() => move(1)} className="border-white/25 text-white">
                <span aria-hidden="true">→</span>
              </IconButton>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}

export function ImageGalleryClient({ images }: { images: GalleryImage[] }) {
  const lightbox = useLightbox(images);

  if (images.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {images.map((image, index) => (
          <button
            key={`${image.url}-${index}`}
            type="button"
            aria-label={`Open image ${index + 1} of ${images.length}${image.alt ? `: ${image.alt}` : ""}`}
            onClick={(event) => lightbox.open(index, event.currentTarget)}
            className="group relative aspect-square min-h-11 overflow-hidden rounded-[var(--site-radius-md)] border border-[var(--site-border)] bg-osi-sand-300/30 text-left transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(0,27,51,0.14)] active:scale-[0.99]"
          >
            <Image
              src={image.url}
              alt={image.alt ?? ""}
              fill
              sizes="(min-width: 640px) 33vw, 50vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          </button>
        ))}
      </div>
      <LightboxDialog images={images} {...lightbox} />
    </>
  );
}

export function TechnicalImageViewer({ image, title }: { image: GalleryImage; title: string }) {
  const images = [image];
  const lightbox = useLightbox(images);

  return (
    <>
      <button
        type="button"
        aria-label={`Open ${title} fullscreen`}
        onClick={(event) => lightbox.open(0, event.currentTarget)}
        className="group relative aspect-[4/3] w-full overflow-hidden rounded-[var(--site-radius-lg)] border border-white/15 bg-osi-white/95 p-4 shadow-[0_22px_70px_rgba(0,0,0,0.18)] transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:shadow-[0_26px_80px_rgba(0,0,0,0.24)] active:translate-y-0"
      >
        <Image
          src={image.url}
          alt={image.alt ?? ""}
          fill
          sizes="(min-width: 768px) 36rem, 100vw"
          loading="eager"
          className="object-contain p-6"
        />
        <span className="absolute right-4 bottom-4 rounded-full border border-osi-navy-900/18 bg-white/90 px-3 py-2 text-xs font-semibold text-osi-navy-900 shadow-sm">
          View fullscreen
        </span>
      </button>
      <LightboxDialog images={images} {...lightbox} />
    </>
  );
}
