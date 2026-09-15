import { z } from "zod";
import { blockCommonSchema } from "@/lib/blocks/common";
import { defineBlock } from "@/lib/blocks/types";
import { Section } from "@/components/ui/section";
import { Clipped } from "@/components/ui/clipped";
import { requiredString, safeHrefSchema } from "@/lib/validation/common";
import type { FieldSpec } from "@/lib/blocks/admin-fields";

// Concrete allowlist scope for this first version (CLAUDE.md's Task 9
// ruling): YouTube, Vimeo, and Google Maps (contact-details.tsx already
// embeds Maps). The union makes it straightforward to add a real
// provider later — no "form/document provider" placeholders with no
// backing use case are fabricated here.
const EMBED_PROVIDERS = ["youtube", "vimeo", "google_maps"] as const;
export type EmbedProvider = (typeof EMBED_PROVIDERS)[number];

const ASPECT_RATIOS = ["16:9", "4:3", "1:1", "auto"] as const;

const schema = blockCommonSchema.extend({
  provider: z.enum(EMBED_PROVIDERS),
  url: safeHrefSchema({ label: "Embed URL" }),
  title: requiredString("Title"),
  aspectRatio: z.enum(ASPECT_RATIOS).default("16:9"),
});

type Data = z.infer<typeof schema>;

const YOUTUBE_PATTERN = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]+)/;
const VIMEO_PATTERN = /vimeo\.com\/(?:video\/)?(\d+)/;

/**
 * Per-provider URL -> embeddable-iframe-src transform, modeled after
 * video-embed-client.tsx's toEmbedUrl (same regex shape for YouTube/
 * Vimeo watch-page URLs -> /embed/ URLs) and contact-details.tsx's
 * mapEmbedUrl (which assumes the editor already pasted Google's own
 * "Embed a map" iframe src). A plain Google Maps share link
 * (google.com/maps/place/...) isn't embeddable as-is — Google's own
 * documented no-API-key trick is appending "&output=embed" to a regular
 * maps URL, so that's applied here rather than leaving editors to
 * discover it (or worse, silently rendering a "refused to connect"
 * iframe). Any URL that doesn't match its provider's pattern falls
 * through unchanged — same non-crashing fallback as toEmbedUrl.
 */
export function toEmbedSrc(provider: EmbedProvider, url: string): string {
  if (provider === "youtube") {
    const match = url.match(YOUTUBE_PATTERN);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  }
  if (provider === "vimeo") {
    const match = url.match(VIMEO_PATTERN);
    return match ? `https://player.vimeo.com/video/${match[1]}` : url;
  }
  if (/google\.[a-z.]+\/maps/.test(url) && !/output=embed|\/maps\/embed/.test(url)) {
    return `${url}${url.includes("?") ? "&" : "?"}output=embed`;
  }
  return url;
}

// Sandboxed per CLAUDE.md's Task 9 ruling: every provider needs
// allow-scripts (all three run JS) and allow-same-origin (needed for
// each provider's own internal navigation/XHR — without it a sandboxed
// iframe's effective origin is "null" and same-origin API calls the
// player itself makes fail). YouTube/Vimeo additionally need
// allow-popups (their share/"watch on YouTube" links open a new tab)
// and allow-presentation (Chromecast/AirPlay casting from the player
// UI). Verified against real embeds in a browser — see the Task 9
// report for what "verified" meant here (a standalone sandboxed-iframe
// harness plus the real built app).
const SANDBOX_BY_PROVIDER: Record<EmbedProvider, string> = {
  youtube: "allow-scripts allow-same-origin allow-popups allow-presentation",
  vimeo: "allow-scripts allow-same-origin allow-popups allow-presentation",
  google_maps: "allow-scripts allow-same-origin allow-popups",
};

const ALLOW_BY_PROVIDER: Record<EmbedProvider, string> = {
  youtube: "autoplay; fullscreen; picture-in-picture",
  vimeo: "autoplay; fullscreen; picture-in-picture",
  google_maps: "fullscreen",
};

const ASPECT_CLASS: Record<(typeof ASPECT_RATIOS)[number], string> = {
  "16:9": "aspect-video",
  "4:3": "aspect-[4/3]",
  "1:1": "aspect-square",
  auto: "aspect-video",
};

function Render({ data }: { data: Data }) {
  const src = toEmbedSrc(data.provider, data.url);
  return (
    <Section
      background={data.background}
      spacingTop={data.spacingTop}
      spacingBottom={data.spacingBottom}
      anchorId={data.anchorId}
    >
      <Clipped
        corner="br"
        size="1.5rem"
        className={`relative w-full overflow-hidden ${ASPECT_CLASS[data.aspectRatio]}`}
      >
        <iframe
          src={src}
          title={data.title}
          loading="lazy"
          sandbox={SANDBOX_BY_PROVIDER[data.provider]}
          allow={ALLOW_BY_PROVIDER[data.provider]}
          allowFullScreen={data.provider !== "google_maps"}
          className="absolute inset-0 h-full w-full border-0"
        />
      </Clipped>
    </Section>
  );
}

const adminFields: FieldSpec[] = [
  { key: "provider", label: "Provider", type: "select", options: [...EMBED_PROVIDERS] },
  { key: "url", label: "Embed URL", type: "text" },
  { key: "title", label: "Title (accessible name)", type: "text" },
  { key: "aspectRatio", label: "Aspect ratio", type: "select", options: [...ASPECT_RATIOS] },
];

export const embedBlock = defineBlock({
  type: "embed",
  label: "Embed",
  category: "media",
  description:
    "Sandboxed iframe embed for YouTube, Vimeo, or Google Maps — for a click-to-play video with a poster image use Video embed instead.",
  schema,
  adminFields,
  defaults: {
    background: "cream",
    spacingTop: "md",
    spacingBottom: "md",
    provider: "youtube",
    url: "",
    title: "",
    aspectRatio: "16:9",
  },
  Render,
});
