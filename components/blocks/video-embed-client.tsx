"use client";

import { useState } from "react";
import { Section } from "@/components/ui/section";
import { Clipped } from "@/components/ui/clipped";
import { DuotoneImage } from "@/components/ui/duotone-image";
import type { VideoEmbedData } from "@/components/blocks/video-embed";

function toEmbedUrl(url: string): string {
  const youtube = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]+)/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}?autoplay=1`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`;
  return url;
}

export function VideoEmbedRender({ data }: { data: VideoEmbedData }) {
  const [loaded, setLoaded] = useState(false);

  // videoUrl is optional at the schema level (see video-embed.tsx) since
  // there's no safe, non-invented URL to default it to — a freshly added
  // block with no URL yet renders nothing rather than a play button that
  // opens a blank iframe.
  if (!data.videoUrl) return null;
  const videoUrl = data.videoUrl;

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
    >
      {data.title && (
        <h2 className="mb-6 font-display text-section tracking-tightest-display uppercase">
          {data.title}
        </h2>
      )}
      <Clipped corner="br" size="1.5rem" className="relative aspect-video w-full overflow-hidden">
        {loaded ? (
          <iframe
            src={toEmbedUrl(videoUrl)}
            title={data.title ?? "Video"}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setLoaded(true)}
            className="group absolute inset-0 flex h-full w-full items-center justify-center"
            aria-label="Play video"
          >
            <DuotoneImage src={data.posterImageUrl} className="absolute inset-0" intensity={0.4} />
            <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-osi-white/90 text-osi-navy-900 transition-transform duration-200 group-hover:scale-105 group-active:scale-95 motion-safe:animate-pulse-glow">
              ▶
            </span>
          </button>
        )}
      </Clipped>
    </Section>
  );
}
