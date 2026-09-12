/**
 * Named handles for the legacy Wix-hosted images used by the seed
 * scripts. The full catalogue of everything the scrape found lives in
 * `content/legacy/image-map.json` (68 images); this file only names the
 * ones actually placed on a page, so a slot's source is greppable.
 *
 * URLs are canonical and transform-stripped:
 *   https://static.wixstatic.com/media/<mediaId>
 *
 * The scraped URLs carried Wix's own crop/resize baked into the path
 * (".../v1/crop/x_0,y_143,w_5187,h_4498/fill/w_1016,h_881,.../file.jpg"),
 * which pins the delivered file to whatever size the *old* layout asked
 * for — far too small for a hero. The bare media-ID form returns the
 * full-resolution original instead, and `next/image` resizes per slot,
 * so the browser still gets an optimised AVIF rather than the original.
 *
 * These stay on the legacy host deliberately (CLAUDE.md constraint 3):
 * absolute URLs, rendered through `lib/media.ts → resolveMediaUrl()`,
 * with `static.wixstatic.com` already allow-listed in
 * `next.config.ts → images.remotePatterns`. Nothing is re-uploaded to
 * Supabase Storage, so moving off Supabase later doesn't drag the media
 * with it — re-hosting is a find-and-replace on one media ID per asset.
 */

const WIX = "https://static.wixstatic.com/media";

export const LEGACY_IMAGES = {
  /** Home hero — the pumpjacks/truck/technician photo from mockup p.1. */
  homeHero: `${WIX}/1ac9e9_f50ca309b071438d93fa3c37869c83baf000.jpg`,

  /**
   * The six tall (128x365 as served) facility photos the legacy home page
   * used for its category tiles, in the order they appeared there. They
   * carry no alt text in the scrape and depict yard/shop scenes rather
   * than a specific product, so they are assigned to the tile grid in
   * source order rather than matched to individual products — swap any
   * of them in the admin if the client wants a specific pairing.
   */
  homeTiles: [
    `${WIX}/1ac9e9_40095ee183db4ad0b94815d65e596dec~mv2.jpeg`,
    `${WIX}/1ac9e9_9b6ca000e95e45e5a5577e555ef92b1e~mv2.jpeg`,
    `${WIX}/1ac9e9_07606a34c1af42af986e99fbd9f4464d~mv2.jpg`,
    `${WIX}/1ac9e9_5b1bf0e2c5294bb4a539dc47e9657431~mv2.jpeg`,
    `${WIX}/1ac9e9_e8f52e10c7f94bc4806c6169bb6f7632~mv2.jpeg`,
    `${WIX}/1ac9e9_cce82f3408e94f20b5f11f9554e0e558~mv2.png`,
  ],

  /** Shop floor / fabrication photos from the machine-shop page. */
  facilityShopFloor: `${WIX}/1ac9e9_7e85f9f8c3264720850a805a3772db31~mv2.jpg`,
  facilityRobot: `${WIX}/1ac9e9_b67b503462e0438699cfefdd32a3e557~mv2.jpeg`,

  /** World map used by the global-locations block (mockup p.1 and p.8). */
  worldMap: `${WIX}/1ac9e9_380ff5223366440d8e2f2503a00442d4~mv2.jpg`,

  /** Product technical diagrams, from each product's own legacy page. */
  diagramGasReleaseSystem: `${WIX}/1ac9e9_669be5a52bb94913a2c1a677eba2c823~mv2.jpg`,
  diagramEspChemScreen: `${WIX}/1ac9e9_2f0373d310194e098b8ef776640f1010~mv2.png`,
  diagramSrpSandLift: `${WIX}/1ac9e9_dc1744e27f5841fdbd2f450622f4fde5~mv2.jpg`,
} as const;
