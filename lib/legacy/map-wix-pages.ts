/**
 * Pure mapping: DOM-snapshot ScrapedItems (lib/legacy/wix-dom.ts) → CMS blocks
 * for the 12 pages the first import flattened. No I/O.
 *
 * The generic path covers prose pages (headings, paragraphs with links/bold,
 * lists, images, documents). A few pages are layouts rather than prose and get
 * a small recipe that picks items out of the snapshot by their text: it never
 * invents wording, it only decides where each Wix element goes (the recipes
 * are listed at the bottom, one per page).
 */
import type { Run, ScrapedItem } from "./clean";
import { imageIdentity, wixOriginalUrl } from "./clean";
import { PLACEHOLDER_ALT_FLAG, altFor, looksLikeFilename, sentenceCase, type BlockSeed, type Json } from "./map";

export interface WixAsset {
  kind: "image" | "file";
  /** Source URL on Wix (original, uncropped). The migration step replaces it with the media-library URL. */
  url: string;
  alt?: string;
  label?: string;
}

export interface MappedWixPage {
  slug: string;
  mode: "replace" | "append";
  blocks: BlockSeed[];
  assets: WixAsset[];
  flags: string[];
  /** Images that are a picture of text/a document: the text (or the PDF) is provided next to them. */
  imageOfText: string[];
  /** Wix elements the mapper deliberately did not carry over, with the reason. */
  skipped: string[];
}

export interface MapOptions {
  /** Rewrites an asset URL (Wix → media library). Defaults to identity. */
  assetUrl?: (url: string, kind: WixAsset["kind"]) => string;
}

// ---------- links ----------

const WIX_TO_CMS: Record<string, string> = {
  "/about-us": "/about-us",
  "/services-1": "/services",
  "/general-8": "/services/fluid-levels",
  "/copia-de-fluid-levels": "/services/pump-cards",
  "/machine-shop": "/services/machine-shop",
  "/careers": "/careers",
  "/hiring": "/careers/hiring",
  "/certifications": "/hse",
  "/iso-45001": "/hse",
  "/sg-sst-policies": "/hse/sg-sst-policies",
  "/osi-directory": "/contact",
  "/privacy-policy": "/privacy-policy",
  "/terms-and-conditions": "/terms-and-conditions",
};

/** Wix address → the CMS page it became; mailto/tel normalised; anything else as the page linked it. */
export function cmsHref(href: string): string {
  if (/^tel:/i.test(href)) return "tel:" + href.slice(4).replace(/[^\d+]/g, "");
  if (/^mailto:/i.test(href)) return href.trim();
  const m = href.match(/^https?:\/\/(?:www\.)?odessaseparator\.com(\/[^?#]*)?(#.*)?$/i);
  if (!m) return href;
  const path = (m[1] ?? "/").replace(/\/$/, "") || "/";
  return (WIX_TO_CMS[path] ?? path) + (m[2] ?? "");
}

const isDocument = (url: string) => /\.(pdf|docx?|xlsx?|pptx?|zip)($|[?#])|\/_files\/ugd\/|docs\.wixstatic\.com\/ugd\//i.test(url);

// ---------- Tiptap ----------

const textNode = (r: Run, href: (h: string) => string): Json => {
  const marks: Json[] = [];
  if (r.bold) marks.push({ type: "bold" });
  if (r.italic) marks.push({ type: "italic" });
  if (r.href) marks.push({ type: "link", attrs: { href: href(r.href) } });
  return marks.length ? { type: "text", text: r.text, marks } : { type: "text", text: r.text };
};

const runsOf = (it: { text: string; runs?: Run[]; href?: string }): Run[] => it.runs ?? [{ text: it.text, ...(it.href && { href: it.href }) }];

class Doc {
  content: Json[] = [];
  constructor(private href: (h: string) => string) {}
  heading(text: string, level: 2 | 3 = 2) {
    this.content.push({ type: "heading", attrs: { level }, content: [{ type: "text", text }] });
  }
  paragraph(runs: Run[]) {
    this.content.push({ type: "paragraph", content: runs.map((r) => textNode(r, this.href)) });
  }
  list(items: Run[][]) {
    this.content.push({
      type: "bulletList",
      content: items.map((runs) => ({ type: "listItem", content: [{ type: "paragraph", content: runs.map((r) => textNode(r, this.href)) }] })),
    });
  }
  get empty() {
    return this.content.length === 0;
  }
  toBlock(): BlockSeed {
    return { type: "rich_text", data: { background: "cream", content: { type: "doc", content: this.content } } };
  }
}

/** The heading level a Wix heading gets: the page's biggest heading level → h2, smaller ones → h3. */
function levelMap(items: ScrapedItem[]): (level: number) => 2 | 3 {
  const levels = [...new Set(items.flatMap((i) => (i.type === "heading" ? [i.level] : [])))].sort((a, b) => a - b);
  return (l) => (l === levels[0] ? 2 : 3);
}

/** Wix headings are ALL CAPS; the product importer shows them in sentence case, and so does this one. */
const headingText = (t: string) => (t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{2}/.test(t) ? sentenceCase(t) : t);

// ---------- generic ----------

interface Ctx {
  title: string;
  assets: WixAsset[];
  flags: string[];
  imageOfText: string[];
  skipped: string[];
  assetUrl: (url: string, kind: WixAsset["kind"]) => string;
  href: (h: string) => string;
}

function newCtx(title: string, opts: MapOptions): Ctx {
  const assetUrl = opts.assetUrl ?? ((u: string) => u);
  const assets: WixAsset[] = [];
  return {
    title,
    assets,
    flags: [],
    imageOfText: [],
    skipped: [],
    assetUrl,
    href: (h) => {
      if (!isDocument(h)) return cmsHref(h);
      if (!assets.some((a) => a.url === h)) assets.push({ kind: "file", url: h });
      return assetUrl(h, "file");
    },
  };
}

type Img = Extract<ScrapedItem, { type: "image" }>;

function imageData(img: Img, ctx: Ctx, items: ScrapedItem[], altOverride?: string) {
  const url = wixOriginalUrl(img.src);
  let alt = altOverride ?? img.alt;
  if (!altOverride && looksLikeFilename(alt)) {
    alt = altFor(items, items.indexOf(img), ctx.title);
    ctx.flags.push(PLACEHOLDER_ALT_FLAG);
  }
  if (!ctx.assets.some((a) => a.url === url)) ctx.assets.push({ kind: "image", url, alt });
  return { url: ctx.assetUrl(url, "image"), alt };
}

/** A small picture (the paperclip icon on a document button) whose link is a document that also appears as a text link. */
function isDocumentIcon(img: Img, items: ScrapedItem[]) {
  return !!img.href && isDocument(img.href) && !!img.box && img.box.h <= 100 && img.box.w <= 320 && items.some((i) => i.type === "pdf" && i.url === img.href);
}

export function genericBlocks(items: ScrapedItem[], ctx: Ctx): BlockSeed[] {
  const blocks: BlockSeed[] = [];
  const lvl = levelMap(items);
  let doc = new Doc(ctx.href);
  const flushDoc = () => {
    if (!doc.empty) blocks.push(doc.toBlock());
    doc = new Doc(ctx.href);
  };
  let images: Img[] = [];
  const flushImages = () => {
    if (images.length === 1) {
      const { url, alt } = imageData(images[0], ctx, items);
      blocks.push({ type: "image", data: { background: "cream", imageUrl: url, alt, decorative: false, ...(images[0].href && !isDocument(images[0].href) && { href: cmsHref(images[0].href) }) } });
    } else if (images.length > 1) {
      blocks.push({ type: "image_gallery", data: { background: "cream", images: images.map((i) => {
        const { url, alt } = imageData(i, ctx, items);
        return { url, alt };
      }) } });
    }
    images = [];
  };
  let buttons: { label: string; href: string }[] = [];
  const flushButtons = () => {
    for (let i = 0; i < buttons.length; i += 3) blocks.push({ type: "button_group", data: { background: "cream", alignment: "left", buttons: buttons.slice(i, i + 3) } });
    buttons = [];
  };
  const flushAll = () => {
    flushDoc();
    flushImages();
    flushButtons();
  };

  let titleDropped = false;
  for (const it of items) {
    switch (it.type) {
      case "heading": {
        if (!titleDropped && it.text.toLowerCase() === ctx.title.toLowerCase()) {
          titleDropped = true; // duplicates the hero
          break;
        }
        flushImages();
        flushButtons();
        doc.heading(headingText(it.text), lvl(it.level));
        break;
      }
      case "paragraph":
        flushImages();
        flushButtons();
        doc.paragraph(runsOf(it));
        break;
      case "list":
        flushImages();
        flushButtons();
        doc.list(it.itemRuns ?? it.items.map((t) => [{ text: t }]));
        break;
      case "image":
        if (it.bg) {
          ctx.skipped.push(`background image ${imageIdentity(it.src)} (decoration)`);
          break;
        }
        if (isDocumentIcon(it, items)) {
          ctx.skipped.push(`document icon ${imageIdentity(it.src)} (the document link carries it)`);
          break;
        }
        flushDoc();
        flushButtons();
        images.push(it);
        break;
      case "pdf":
      case "link":
        flushDoc();
        flushImages();
        buttons.push({ label: it.text || (it.type === "pdf" ? "Download" : it.url), href: ctx.href(it.url) });
        break;
      case "video":
        flushAll();
        blocks.push({ type: "video_embed", data: { background: "cream", videoUrl: it.url } });
        break;
      case "embed":
        flushAll();
        ctx.skipped.push(`embedded widget ${it.url.slice(0, 80)}`);
        break;
      default:
        break;
    }
  }
  flushAll();
  return blocks;
}

const hero = (title: string, extra: Record<string, Json> = {}): BlockSeed => ({ type: "hero_page", data: { background: "navy", title, ...extra } });
const ncase = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const textOf = (i: ScrapedItem | undefined) => (i && (i.type === "heading" || i.type === "paragraph") ? i.text : "");

// ---------- recipes (one per page that is a layout, not prose) ----------

type RecipeResult = BlockSeed[] | { blocks: BlockSeed[]; hero: Record<string, Json> };
type Recipe = (items: ScrapedItem[], ctx: Ctx) => RecipeResult;

/** About Us: Vision | Mission as two columns, then History, QMS Policy and Core Values with its PDF at the end. */
const aboutUs: Recipe = (items, ctx) => {
  const vision = items.findIndex((i) => i.type === "heading" && i.text === "VISION");
  const mission = items.findIndex((i) => i.type === "heading" && i.text === "MISSION");
  const blocks: BlockSeed[] = [];
  const rest = items.filter((_, i) => ![vision, vision + 1, mission, mission + 1].includes(i));
  if (vision >= 0 && mission >= 0) {
    blocks.push({
      type: "columns",
      data: {
        background: "cream",
        columns: [vision, mission].map((at) => ({ type: "text", heading: headingText(textOf(items[at])), body: textOf(items[at + 1]) })),
      },
    });
  }
  // The document button belongs after the Core Values it sits beside.
  const pdf = rest.filter((i) => i.type === "pdf");
  const body = rest.filter((i) => i.type !== "pdf");
  return [...blocks, ...genericBlocks([...body, ...pdf], ctx)];
};

/** Services: three cards (image, title, tagline) linking to the subpages. */
const services: Recipe = (items, ctx) => {
  const heads = items.filter((i): i is Extract<ScrapedItem, { type: "heading" }> => i.type === "heading" && !!i.href);
  const tiles = heads.map((h) => {
    const at = items.indexOf(h);
    const next = items.findIndex((i, k) => k > at && i.type === "heading");
    const body = items
      .slice(at + 1, next === -1 ? undefined : next)
      .filter((i) => i.type === "paragraph")
      .map(textOf)
      .join(" ");
    // A card's photo(s) sit directly above its title: the images between the previous card's title and this one.
    const prevTop = heads[heads.indexOf(h) - 1]?.box?.y ?? -Infinity;
    const imgs = items.filter((i): i is Img => i.type === "image" && !i.bg && !!i.box && i.box.y < h.box!.y && i.box.y > prevTop - 1 && (!heads[heads.indexOf(h) - 1] || i.box.y >= prevTop));
    if (imgs.length > 1) ctx.skipped.push(`${imgs.length - 1} extra photo(s) on the ${h.text} card (a tile shows one image)`);
    const first = imgs[0];
    return {
      title: headingText(h.text),
      body,
      href: cmsHref(h.href!),
      ...(first && { imageUrl: imageData(first, ctx, items).url }),
    };
  });
  return [{ type: "feature_tiles", data: { background: "cream", tiles } }];
};

/** Machine Shop: five sections of heading + caption + photos, as laid out on Wix. */
const machineShop: Recipe = (items, ctx) => {
  const img = (needle: string): Img | undefined => items.find((i): i is Img => i.type === "image" && i.src.includes(needle));
  const sec = (heading: string, sub: string | null, extra: (Img | string)[]): BlockSeed[] => {
    const out: BlockSeed[] = [];
    const d = new Doc(ctx.href);
    d.heading(heading, 2);
    if (sub) d.paragraph([{ text: sub }]);
    const imgs = extra.filter((e): e is Img => typeof e !== "string");
    const texts = extra.filter((e): e is string => typeof e === "string");
    out.push(d.toBlock());
    if (imgs.length === 1) {
      const { url, alt } = imageData(imgs[0], ctx, items);
      out.push({ type: "image", data: { background: "cream", imageUrl: url, alt, decorative: false } });
    } else if (imgs.length > 1) {
      out.push({ type: "image_gallery", data: { background: "cream", images: imgs.map((i) => { const { url, alt } = imageData(i, ctx, items); return { url, alt }; }) } });
    }
    if (texts.length) {
      const t = new Doc(ctx.href);
      for (const x of texts) t.paragraph([{ text: x }]);
      out.push(t.toBlock());
    }
    return out;
  };
  const p = (start: string) => items.find((i) => i.type === "paragraph" && i.text.startsWith(start));
  const diameters = items.find((i) => i.type === "heading" && i.text.startsWith("Diameters"));
  const combines = items.find((i) => i.type === "heading" && i.text.startsWith("Combines"));
  const welding = textOf(p("Robotic welding"));
  const vertical = items.filter((i) => i.type === "paragraph" && /^1 - \d/.test(i.text)).map(textOf);
  const vmcText = textOf(p("Vertical Machining, also known"));
  const turning = textOf(p("These machines can be capable"));
  const services = items.find((i) => i.type === "list");
  const doc = new Doc(ctx.href);
  doc.heading("Services", 2);
  if (services?.type === "list") doc.list(services.itemRuns ?? services.items.map((t) => [{ text: t }]));

  const blocks: BlockSeed[] = [];
  blocks.push(...sec(headingText("WE ARE HERE TO PARTNER WITH YOU"), null, []));
  blocks.push(...sec(headingText("PLASMA CUTTING MACHINE"), textOf(combines), [img("4d2dc0bc573f")!, img("6d30f0d4a2bf")!].filter(Boolean) as Img[]));
  blocks.push(...sec(headingText("TURNING CENTERS"), textOf(diameters), [img("0f68c2e20492")!, img("2584e4035ef4")!, ...(turning ? [turning] : [])].filter(Boolean) as (Img | string)[]));
  blocks.push(doc.toBlock());
  blocks.push(...sec(headingText("VERTICAL MACHINING CENTERS"), null, [...vertical, img("7e85f9f8c326")!, ...(vmcText ? [vmcText] : [])].filter(Boolean) as (Img | string)[]));
  blocks.push(...sec(headingText("WELDING ROBOTS"), null, [img("b67b503462e0")!, ...(welding ? [welding] : [])].filter(Boolean) as (Img | string)[]));
  return blocks;
};

/** Careers: organization summary beside a photo, then the ADP job board as a button (never copy the listings). */
const careers: Recipe = (items, ctx) => {
  const base = genericBlocks(items.filter((i) => i.type !== "embed"), ctx);
  ctx.flags.push("job_board_is_adp_workforce_now");
  base.push({
    type: "button_group",
    data: { background: "cream", alignment: "left", anchorId: "employmentapplication", buttons: [{ label: "View openings and apply", href: ADP_CAREERS_URL }] },
  });
  return base;
};

export const ADP_CAREERS_URL =
  "https://workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=4515c7ce-8f29-41b9-a6a8-de34302fcf11&ccId=19000101_000003&lang=en_US";

/** HSE: the Wix hero photo + title become the page hero; the two certifications follow. */
const hse: Recipe = (items, ctx) => {
  const bg = items.find((i): i is Img => i.type === "image" && !!i.box && i.box.w >= 1200);
  const h1 = items.find((i) => i.type === "heading" && i.level === 1);
  const intro = items.find((i) => i.type === "paragraph" && i.section === (h1 as { section?: number } | undefined)?.section);
  const rest = items.filter((i) => i !== bg && i !== h1 && i !== intro);
  const blocks: BlockSeed[] = [];
  if (h1 || intro) {
    const d = new Doc(ctx.href);
    if (h1) d.heading(textOf(h1), 2);
    if (intro) d.paragraph(runsOf(intro as Extract<ScrapedItem, { type: "paragraph" }>));
    blocks.push(d.toBlock());
  }
  const generic = genericBlocks(rest, ctx);
  const heroExtra: Record<string, Json> = {};
  if (bg) {
    const { url, alt } = imageData(bg, ctx, items, "Oil well drilling rig");
    heroExtra.imageUrl = url;
    ctx.flags.push(`hero_image_alt_written_for_${imageIdentity(bg.src)}_${alt ? "ok" : "missing"}`);
  }
  return { blocks: [...blocks, ...generic], hero: heroExtra };
};


/** SG-SST (Spanish, kept as on Wix): seven sections in Wix's order, every PDF a download, each document preview image with a factual alt. */
const sgSst: Recipe = (items, ctx) => {
  const blocks: BlockSeed[] = [];
  const img = (needle: string) => items.find((i): i is Img => i.type === "image" && i.src.includes(needle));
  const pdfBy = (needle: string) => items.find((i): i is Extract<ScrapedItem, { type: "pdf" }> => i.type === "pdf" && i.url.includes(needle));
  const button = (pdf: Extract<ScrapedItem, { type: "pdf" }> | undefined): BlockSeed[] =>
    pdf ? [{ type: "button_group", data: { background: "cream", alignment: "left", buttons: [{ label: pdf.text, href: ctx.href(pdf.url) }] } }] : [];
  const picture = (needle: string, alt: string, note: string): BlockSeed[] => {
    const i = img(needle);
    if (!i) return [];
    ctx.imageOfText.push(`${imageIdentity(i.src)}: ${note}`);
    const { url } = imageData(i, ctx, items, alt);
    return [{ type: "image", data: { background: "cream", imageUrl: url, alt, decorative: false, displayWidth: 720 } }];
  };
  const heading = (t: string) => {
    const d = new Doc(ctx.href);
    d.heading(headingText(t), 2);
    return d;
  };
  const h = (starts: string) => items.find((i) => i.type === "heading" && ncase(i.text).startsWith(ncase(starts)));

  // 1. Política de seguridad y salud en el trabajo
  blocks.push(heading(textOf(h("Politica de seguridad"))).toBlock());
  blocks.push(...picture("33dae9e75649", "Vista previa del documento «Política de seguridad y salud en el trabajo», código OSI-SST-003, versión 03", "preview of the PDF's first page; the PDF is the real content"));
  blocks.push(...button(pdfBy("a02f2924")));

  // 2. Política (healthy habits / substances / teleworking)
  const polHead = h("Política");
  const list = items.find((i) => i.type === "list" && i.items[0]?.startsWith("Estilos de Vida"));
  const d2 = heading(textOf(polHead));
  if (list?.type === "list") d2.list(list.itemRuns ?? list.items.map((t) => [{ text: t }]));
  blocks.push(d2.toBlock());
  blocks.push(...picture("749a0888ea87", "Vista previa de las políticas de hábitos y estilos de vida saludable (OSI-SST-005), de prevención del consumo de alcohol, tabaco y sustancias psicoactivas (OSI-SST-006) y de teletrabajo (OSI-SST-076)", "preview of three policy PDFs"));
  blocks.push(...button(pdfBy("827e2388")));

  // 3. Estadísticas de acoso sexual en el trabajo (the two counters are text drawn inside the image)
  const stats = new Doc(ctx.href);
  stats.heading(headingText(`${textOf(h("ESTADÍSTICAS DE ACOSO"))} ${textOf(h("SEXUAL EN EL TRABAJO"))}`), 2);
  stats.list([[{ text: "Quejas tramitadas: 0" }], [{ text: "Sanciones impuestas: 0" }]]);
  blocks.push(stats.toBlock());
  blocks.push(...picture("7669b47c02f7", "Quejas tramitadas: 0. Sanciones impuestas: 0.", "text drawn in the image (\"Quejas tramitadas 0 / Sanciones impuestas 0\"), repeated above as a real list"));
  blocks.push(...button(pdfBy("bc1012de")));

  // 4. Política de prevención de la violencia, acoso y discriminación
  blocks.push(heading(textOf(h("POLITICA DE PREVENCION"))).toBlock());
  blocks.push(...picture("112bb04b9069", "Vista previa del documento «Política de prevención de la violencia, el acoso y la discriminación en el trabajo», código OSI-SST-004, versión 03", "preview of the PDF's first page; the PDF is the real content"));
  blocks.push(...button(pdfBy("e24a9af5")));

  // 5. Formato para presentar quejas + mailto
  blocks.push(heading(textOf(h("FORMATO PARA PRESENTAR"))).toBlock());
  blocks.push(...button(pdfBy("7a478fe6")));
  const mail = items.find((i) => i.type === "paragraph" && i.text.startsWith("Descargar y enviar"));
  if (mail?.type === "paragraph") {
    const d = new Doc(ctx.href);
    d.paragraph(runsOf(mail));
    blocks.push(d.toBlock());
  }

  // 6. Valores corporativos
  const values = items.filter((i) => i.type === "paragraph" && ["Sostenibilidad", "Mejoramiento Continuo", "Consistencia", "Respeto", "Justicia"].includes(i.text));
  const d6 = heading(textOf(h("VALORES CORPORATIVOS")));
  d6.list(values.map((v) => [{ text: textOf(v) }]));
  blocks.push(d6.toBlock());
  const team = img("2b593b69939c");
  if (team) {
    const { url, alt } = imageData(team, ctx, items);
    blocks.push({ type: "image", data: { background: "cream", imageUrl: url, alt, decorative: false } });
  }

  // 7. Tarjeta líder
  blocks.push(heading(textOf(h("TARJETA"))).toBlock());
  blocks.push(...button(pdfBy("ecba681c")));
  return blocks;
};

/** Contact: Wix's directory as sections below the existing map/form blocks (which the migration leaves in place). */
const contact: Recipe = (items, ctx) => {
  const blocks: BlockSeed[] = [];
  const headings = items.filter((i): i is Extract<ScrapedItem, { type: "heading" }> => i.type === "heading" && !!i.box).sort((a, b) => a.box!.y - b.box!.y);
  const after = items.find((i): i is Img => i.type === "image" && i.src.includes("617f7421ba51"));
  if (after) {
    ctx.imageOfText.push(`${imageIdentity(after.src)}: "After hours, holidays and weekend. Call us: +1-432-580-7111" drawn in the image, repeated below as real text`);
    const { url } = imageData(after, ctx, items, "After hours, holidays and weekend. Call us: +1-432-580-7111");
    const d = new Doc(ctx.href);
    d.paragraph([{ text: "After hours, holidays and weekend. Call us: " }, { text: "+1-432-580-7111", href: "tel:+14325807111" }]);
    blocks.push(d.toBlock());
    void url; // the picture is a phone handset + the same words; only the text is carried over
  }
  headings.forEach((hd, n) => {
    const top = hd.box!.y;
    const bottom = headings[n + 1]?.box!.y ?? Infinity;
    const inSection = items.filter((i) => i !== hd && i.box && i.box.y >= top && i.box.y < bottom);
    // One card per Wix text box (group); the first bold line is the person's name.
    const byGroup = new Map<number, Extract<ScrapedItem, { type: "paragraph" }>[]>();
    for (const i of inSection) if (i.type === "paragraph" && i.group != null) byGroup.set(i.group, [...(byGroup.get(i.group) ?? []), i]);
    const cards = [...byGroup.values()]
      .map((ps) => ({ ps, x: Math.min(...ps.map((p) => p.box!.x)), y: Math.min(...ps.map((p) => p.box!.y)), w: Math.max(...ps.map((p) => p.box!.w)) }))
      .sort((a, b) => a.y - b.y || a.x - b.x);
    // Rows: cards whose tops are within 100px read left to right.
    const rows: (typeof cards)[] = [];
    for (const c of cards) {
      const row = rows[rows.length - 1];
      if (row && Math.abs(row[0].y - c.y) < 100) row.push(c);
      else rows.push([c]);
    }
    const ordered = rows.flatMap((r) => r.sort((a, b) => a.x - b.x));
    const logos = inSection.filter((i): i is Img => i.type === "image" && !i.bg);
    let doc = new Doc(ctx.href);
    doc.heading(headingText(hd.text), 2);
    const place = new Map<(typeof ordered)[number], Img>();
    for (const logo of logos) {
      const lb = logo.box!;
      const best = ordered
        .filter((c) => c.x < lb.x + lb.w && c.x + c.w > lb.x && c.y >= lb.y - 20 && !place.has(c))
        .sort((a, b) => a.y - b.y)[0];
      if (best) place.set(best, logo);
      else ctx.skipped.push(`logo ${logo.alt} not tied to a person card`);
    }
    for (const c of ordered) {
      const logo = place.get(c);
      if (logo) {
        if (!doc.empty) blocks.push(doc.toBlock());
        doc = new Doc(ctx.href);
        const { url, alt } = imageData(logo, ctx, items, logo.alt.replace(/\.(png|jpe?g)$/i, "").trim() || undefined);
        blocks.push({ type: "image", data: { background: "cream", imageUrl: url, alt, decorative: false, alignment: "left", displayWidth: 200 } });
      }
      for (const p of c.ps) doc.paragraph(runsOf(p));
    }
    if (!doc.empty) blocks.push(doc.toBlock());
  });
  return blocks;
};

export interface PageSpec {
  slug: string;
  file: string;
  title: string;
  template: "standard" | "legal" | "contact";
  recipe?: Recipe;
  /** "append": keep the page's existing blocks and add these after them (Contact). */
  mode?: "replace" | "append";
}

export const WIX_PAGE_SPECS: PageSpec[] = [
  { slug: "about-us", file: "about-us", title: "About Us", template: "standard", recipe: aboutUs },
  { slug: "services", file: "services", title: "Services", template: "standard", recipe: services },
  { slug: "services/fluid-levels", file: "services__fluid-levels", title: "Fluid Levels", template: "standard" },
  { slug: "services/pump-cards", file: "services__pump-cards", title: "Pump Cards", template: "standard" },
  { slug: "services/machine-shop", file: "services__machine-shop", title: "Machine Shop", template: "standard", recipe: machineShop },
  { slug: "careers", file: "careers", title: "Careers", template: "standard", recipe: careers },
  { slug: "careers/hiring", file: "careers__hiring", title: "Hiring", template: "standard" },
  { slug: "hse", file: "hse", title: "HSE", template: "standard", recipe: hse },
  { slug: "hse/sg-sst-policies", file: "hse__sg-sst-policies", title: "SG-SST Policies", template: "standard", recipe: sgSst },
  { slug: "contact", file: "contact", title: "Contact", template: "contact", recipe: contact, mode: "append" },
  { slug: "privacy-policy", file: "privacy-policy", title: "Privacy Policy", template: "legal" },
  { slug: "terms-and-conditions", file: "terms-and-conditions", title: "Terms and Conditions", template: "legal" },
];

export function mapWixPage(spec: PageSpec, items: ScrapedItem[], opts: MapOptions = {}): MappedWixPage {
  const ctx = newCtx(spec.title, opts);
  const result: RecipeResult = spec.recipe ? spec.recipe(items, ctx) : genericBlocks(items, ctx);
  const blocks = Array.isArray(result) ? result : result.blocks;
  const heroExtra = Array.isArray(result) ? {} : result.hero;
  const darkHero = spec.template === "legal" ? "cream" : "navy";
  if (spec.mode === "append") return { slug: spec.slug, mode: "append", blocks, assets: ctx.assets, flags: [...new Set(ctx.flags)], imageOfText: ctx.imageOfText, skipped: ctx.skipped };
  return {
    slug: spec.slug,
    mode: "replace",
    blocks: [{ type: "hero_page", data: { background: darkHero, title: spec.title, ...heroExtra } }, ...blocks],
    assets: ctx.assets,
    flags: [...new Set(ctx.flags)],
    imageOfText: ctx.imageOfText,
    skipped: ctx.skipped,
  };
}

export { hero };
