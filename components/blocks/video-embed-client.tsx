"use client";

import { useState } from "react";
import { Section } from "@/components/ui/section";
import { Clipped } from "@/components/ui/clipped";
import { DuotoneImage } from "@/components/ui/duotone-image";
import type { VideoEmbedData } from "@/components/blocks/video-embed";
import { longTitle } from "@/lib/text/long-title";

export function toEmbedUrl(url: string): string {
  // Imported Wix embeds are already /embed/ URLs carrying `autoplay=0`; the visitor just clicked our
  // poster, so start playing instead of making them click Play a second time inside YouTube.
  const embed = url.match(/youtube\.com\/embed\/([\w-]+)/);
  if (embed) return `https://www.youtube.com/embed/${embed[1]}?autoplay=1&rel=0`;
  const youtube = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]+)/);
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}?autoplay=1`;
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1`;
  return url;
}

/** A directly hosted video file (Wix-hosted uploads are mp4), played with the browser's own player. */
export const isDirectVideo = (url: string) => /\.(mp4|webm|mov)(\?|$)/i.test(url) || /video\.wixstatic\.com\/video\//i.test(url);

/** The thumbnail YouTube serves for a video, used when nobody picked a poster. */
export function youtubePoster(url: string): string | undefined {
  const id = url.match(/youtube\.com\/embed\/([\w-]+)/)?.[1] ?? url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]+)/)?.[1];
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : undefined;
}

/** The click-to-play poster + iframe, without a Section — shared by the video block and `media_text`. */
export function VideoPlayer({
  videoUrl,
  title,
  posterImageUrl,
}: {
  videoUrl: string;
  title?: string;
  posterImageUrl?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const poster = posterImageUrl ?? youtubePoster(videoUrl);

  return (
    <Clipped corner="br" size="1.5rem" className="relative aspect-video w-full overflow-hidden">
      {loaded && isDirectVideo(videoUrl) ? (
        <video src={videoUrl} poster={poster} controls autoPlay playsInline className="absolute inset-0 h-full w-full bg-osi-navy-900 object-contain" />
      ) : loaded ? (
        <iframe
          src={toEmbedUrl(videoUrl)}
          title={title ?? "Video"}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          // Same sandbox value as the new `embed` block's youtube/vimeo
          // providers (components/blocks/embed.tsx) — allow-scripts +
          // allow-same-origin for the player itself, allow-popups for
          // its share/"watch on YouTube" links, allow-presentation for
          // Chromecast/AirPlay casting from the player UI.
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setLoaded(true)}
          className="group absolute inset-0 flex h-full w-full items-center justify-center"
          aria-label="Play video"
        >
          {/* DuotoneImage is itself `relative`; giving it `absolute inset-0` too collapsed it to zero height, so the poster never showed. */}
          <div className="absolute inset-0">
            <DuotoneImage src={poster} className="h-full w-full" intensity={0.4} sizes="(min-width: 1280px) 72rem, 100vw" />
          </div>
          <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-osi-white/90 text-osi-navy-900 shadow-xl transition-transform duration-200 group-hover:scale-105 group-active:scale-[0.98]">
            <svg aria-hidden="true" viewBox="0 0 24 24" className="ml-1 h-6 w-6 fill-current">
              <path d="M8 5.5v13l10-6.5L8 5.5Z" />
            </svg>
          </span>
        </button>
      )}
    </Clipped>
  );
}

export function VideoEmbedRender({ data }: { data: VideoEmbedData }) {
  // videoUrl is optional at the schema level (see video-embed.tsx) since
  // there's no safe, non-invented URL to default it to — a freshly added
  // block with no URL yet renders nothing rather than a play button that
  // opens a blank iframe.
  if (!data.videoUrl) return null;

  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
    >
      {data.title && (
        <h2 {...longTitle(data.title)} className="mb-6 font-editorial text-section font-semibold text-balance">
          {data.title}
        </h2>
      )}
      <VideoPlayer videoUrl={data.videoUrl} title={data.title} posterImageUrl={data.posterImageUrl} />
    </Section>
  );
}
