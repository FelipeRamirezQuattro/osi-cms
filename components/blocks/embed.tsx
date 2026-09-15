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

// No "auto" here (unlike image.tsx's aspect-ratio preset) — an iframe
// has no intrinsic natural size to fall back to the way an <img> does,
// so an "auto" option would be dead (mapping to the same class as
// "16:9" with no distinct behavior of its own). Reviewed and confirmed
// after Task 9's initial pass shipped exactly that dead option.
const ASPECT_RATIOS = ["16:9", "4:3", "1:1"] as const;

/**
 * Per-provider hostname allowlist, checked against the *parsed* URL's
 * hostname — never a substring match against the raw URL string. This
 * is the fix for a real security review finding on Task 9's first pass:
 * `provider` didn't actually gate `url` at all, so `{provider:
 * "youtube", url: "https://attacker.example/pwn"}` was schema-valid and
 * rendered verbatim in a sandboxed iframe — and because `safeHrefSchema`
 * also accepts a same-origin `/path`, that specific combination (a
 * same-origin document framed with `allow-scripts allow-same-origin`)
 * is a genuine sandbox escape, not just a weak embed. Relative/
 * same-origin paths are rejected outright for this field below (a
 * third-party embed is never same-origin); a `google.com/maps`
 * substring anywhere in the URL (e.g. inside an unrelated query
 * parameter) no longer counts as "a Maps URL" either, since this checks
 * `new URL(url).hostname` specifically.
 */
function isAllowedHost(provider: EmbedProvider, hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (provider === "youtube") {
    return host === "youtube.com" || host === "www.youtube.com" || host === "youtu.be";
  }
  if (provider === "vimeo") {
    return host === "vimeo.com" || host === "player.vimeo.com";
  }
  // Google Maps embeds are legitimately served from any country-code
  // Google domain (google.com, google.co.uk, google.de, ...) or its
  // "maps." subdomain — not a fixed list of TLDs.
  return /^(?:www\.)?google\.[a-z.]{2,}$/.test(host) || /^maps\.google\.[a-z.]{2,}$/.test(host);
}

const PROVIDER_LABEL: Record<EmbedProvider, string> = {
  youtube: "YouTube",
  vimeo: "Vimeo",
  google_maps: "Google Maps",
};

const schema = blockCommonSchema
  .extend({
    provider: z.enum(EMBED_PROVIDERS),
    url: safeHrefSchema({ label: "Embed URL" }),
    title: requiredString("Title"),
    aspectRatio: z.enum(ASPECT_RATIOS).default("16:9"),
  })
  .superRefine((data, ctx) => {
    let hostname: string | null = null;
    try {
      hostname = new URL(data.url).hostname;
    } catch {
      // Not parseable as an absolute URL — either malformed, or a
      // same-origin "/path" that safeHrefSchema allows for other block
      // types' link fields but that can never be a legitimate
      // third-party embed source.
      hostname = null;
    }
    if (!hostname || !isAllowedHost(data.provider, hostname)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["url"],
        message: `Embed URL must be a real ${PROVIDER_LABEL[data.provider]} URL`,
      });
    }
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
 * discover it.
 *
 * Fails closed (returns `null`, not the raw URL) whenever the host is
 * right but nothing recognizable was found to embed — e.g. a real
 * youtube.com URL that isn't a watch/embed/short-link video page, or a
 * real google.<tld> URL that isn't under /maps at all. The schema above
 * already rejects the wrong host entirely; this is the second,
 * independent layer that stops Render from ever framing a URL it
 * didn't actually recognize, matching Task 9's original brief ("no
 * dangerouslySetInnerHTML anywhere") in spirit — an unrecognized src is
 * exactly as unsafe to render blind as raw HTML would be.
 */
export function toEmbedSrc(provider: EmbedProvider, url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!isAllowedHost(provider, parsed.hostname)) return null;

  if (provider === "youtube") {
    const match = url.match(YOUTUBE_PATTERN);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  }
  if (provider === "vimeo") {
    const match = url.match(VIMEO_PATTERN);
    return match ? `https://player.vimeo.com/video/${match[1]}` : null;
  }
  // google_maps: checked by pathname, not a substring match anywhere in
  // the URL (the pre-fix version matched "google.com/maps" even inside
  // an unrelated query parameter value).
  if (parsed.pathname.includes("/maps/embed") || parsed.searchParams.get("output") === "embed") {
    return url;
  }
  if (parsed.pathname.startsWith("/maps")) {
    parsed.searchParams.set("output", "embed");
    return parsed.toString();
  }
  return null;
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
// harness plus the real built app). `allow-same-origin` combined with
// `allow-scripts` is only safe here because the schema above guarantees
// `url` resolves to one of these three third-party hosts, never a
// same-origin document — that combination on a same-origin frame would
// be a sandbox escape (a framed same-origin doc can reach into
// window.parent.document and strip its own sandbox attribute).
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
};

function Render({ data }: { data: Data }) {
  const src = toEmbedSrc(data.provider, data.url);
  // Fail closed: the schema already rejects the wrong host at save
  // time, but toEmbedSrc is the second, independent gate — if it still
  // can't resolve a real embeddable src (see its own comment), render
  // nothing rather than frame a URL nobody actually verified.
  if (!src) return null;

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
