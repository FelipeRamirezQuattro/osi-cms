/**
 * Reads a snapshot of a rendered Wix page (scripts/snapshot-wix-pages.ts) into
 * ScrapedItems that keep the structure the first two scrapes lost:
 *
 *  - inline runs stay separate and are re-joined with the spacing the page
 *    actually has (`<a>x@y.com&nbsp;</a>or` → "x@y.com or"), instead of the
 *    glued `textContent` ("x@y.comor");
 *  - links survive at any position in a paragraph (mailto:, tel:, documents,
 *    in-page anchors), not only when the whole paragraph is a link;
 *  - bold/italic come from the computed weight/style the snapshot records
 *    (`data-fw`/`data-fi`), because Wix does not use <strong>;
 *  - Wix's text-drawn bullets ("• one<br>• two") become real lists;
 *  - every heading stays its own heading (the old importer merged adjacent
 *    ones, which produced a single 400-character "heading" on Machine Shop);
 *  - images (incl. CSS backgrounds), documents, iframes and buttons are items.
 *
 * Pure: takes a DOM node, returns data. jsdom runs it in tests and in the
 * mapper script; no browser needed.
 */
import { imageIdentity, stripZeroWidth, type ItemBox, type Run, type ScrapedItem } from "./clean";

const BULLET = "[•●▪◦‣∙·✔✓✅☑]";
const DASH_START = /^\s*[-–—]\s+\S/;
const DOCUMENT_URL = /\.(pdf|docx?|xlsx?|pptx?|zip)($|[?#])|\/_files\/ugd\/|docs\.wixstatic\.com\/ugd\//i;
const BLOCK_TAGS = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "table", "img", "iframe", "section", "button"]);

const num = (v: string | null | undefined, fallback = 0) => (v == null || v === "" ? fallback : Number(v));

function boxOf(el: Element): ItemBox | undefined {
  const raw = el.getAttribute("data-box");
  if (!raw) return undefined;
  const [x, y, w, h] = raw.split(",").map(Number);
  return [x, y, w, h].every(Number.isFinite) ? { x, y, w, h } : undefined;
}

const isHidden = (el: Element) => el.getAttribute("data-hidden") === "1";

// ---------- inline runs ----------

interface RunState {
  bold: boolean;
  italic: boolean;
  href?: string;
}

/** Wix wraps a bold word in a span whose computed weight is 600+ while the block's own weight is not. */
function styleOf(el: Element, block: Element, parent: RunState): RunState {
  const fw = num(el.getAttribute("data-fw"), 400);
  const blockFw = num(block.getAttribute("data-fw"), 400);
  const state: RunState = { ...parent };
  if (fw >= 600 && blockFw < 600) state.bold = true;
  if (el.getAttribute("data-fi") === "1" && block.getAttribute("data-fi") !== "1") state.italic = true;
  if (el.tagName.toLowerCase() === "a") {
    const href = el.getAttribute("href")?.trim();
    if (href) state.href = href;
  }
  return state;
}

function collectRuns(node: Node, block: Element, state: RunState, out: Run[]) {
  if (node.nodeType === 3) {
    const text = node.textContent ?? "";
    if (text) out.push({ text, ...(state.bold && { bold: true }), ...(state.italic && { italic: true }), ...(state.href && { href: state.href }) });
    return;
  }
  if (node.nodeType !== 1) return;
  const el = node as Element;
  if (isHidden(el)) return;
  const tag = el.tagName.toLowerCase();
  if (tag === "br") {
    out.push({ text: "\n" });
    return;
  }
  if (tag === "img" || tag === "svg" || tag === "script" || tag === "style") return;
  const next = tag === block.tagName.toLowerCase() && el === block ? state : styleOf(el, block, state);
  // A <p>/<div> inside a text block starts a new line.
  const startsLine = el !== block && (tag === "p" || tag === "div" || tag === "li");
  if (startsLine) out.push({ text: "\n" });
  for (const child of Array.from(el.childNodes)) collectRuns(child, block, next, out);
  if (startsLine) out.push({ text: "\n" });
}

const sameMarks = (a: Run, b: Run) => !!a.bold === !!b.bold && !!a.italic === !!b.italic && a.href === b.href;

/** Collapses whitespace (nbsp and zero-width characters included) across run boundaries and merges neighbours with the same marks. */
export function normalizeRuns(runs: Run[]): Run[] {
  const cleaned: Run[] = [];
  for (const r of runs) {
    if (r.text === "\n") {
      cleaned.push(r);
      continue;
    }
    const text = stripZeroWidth(r.text).replace(/[\s ]+/g, " ");
    if (text) cleaned.push({ ...r, text });
  }
  const merged: Run[] = [];
  for (const r of cleaned) {
    const last = merged[merged.length - 1];
    if (last && last.text !== "\n" && r.text !== "\n" && sameMarks(last, r)) last.text += r.text;
    else merged.push({ ...r });
  }
  // No double spaces across boundaries; no spaces at line edges.
  let prevEndsSpace = true;
  for (const r of merged) {
    if (r.text === "\n") {
      prevEndsSpace = true;
      continue;
    }
    if (prevEndsSpace) r.text = r.text.replace(/^ /, "");
    prevEndsSpace = r.text.endsWith(" ");
  }
  const out: Run[] = [];
  for (let i = 0; i < merged.length; i++) {
    const r = merged[i];
    if (r.text === "\n") {
      const prev = out[out.length - 1];
      if (prev && prev.text !== "\n") prev.text = prev.text.replace(/ $/, "");
      if (prev && prev.text === "") out.pop();
      if (out.length && out[out.length - 1].text !== "\n") out.push(r);
      continue;
    }
    if (r.text) out.push(r);
  }
  while (out.length && (out[out.length - 1].text === "\n" || out[out.length - 1].text.trim() === "")) out.pop();
  if (out.length) out[out.length - 1].text = out[out.length - 1].text.replace(/ $/, "");
  return out.filter((r, i) => r.text !== "" && !(r.text === "\n" && i === 0));
}

export const runsText = (runs: Run[]) => runs.map((r) => r.text).join("");

/** Splits normalized runs into lines at "\n" runs. */
function toLines(runs: Run[]): Run[][] {
  const lines: Run[][] = [[]];
  for (const r of runs) {
    if (r.text === "\n") lines.push([]);
    else lines[lines.length - 1].push(r);
  }
  return lines.map((l) => normalizeRuns(l)).filter((l) => runsText(l).trim());
}

/** Cuts `runs` between character offsets, keeping each run's marks. */
export function sliceRuns(runs: Run[], start: number, end = Infinity): Run[] {
  const out: Run[] = [];
  let pos = 0;
  for (const r of runs) {
    const from = Math.max(start - pos, 0);
    const to = Math.min(end - pos, r.text.length);
    if (to > from) out.push({ ...r, text: r.text.slice(from, to) });
    pos += r.text.length;
  }
  return normalizeRuns(out);
}

/** Wix draws bullets as text characters ("• one • two" or one per <br> line). Returns the intro text (if any) and the bullet items. */
export function splitBulletLine(line: Run[]): { lead: Run[]; bullets: Run[][] } | null {
  const text = runsText(line);
  const re = new RegExp(BULLET, "g");
  const marks = [...text.matchAll(re)].map((m) => m.index!);
  if (marks.length) {
    const lead = sliceRuns(line, 0, marks[0]);
    const bullets = marks.map((at, i) => sliceRuns(line, at + 1, marks[i + 1] ?? Infinity)).filter((b) => runsText(b).trim());
    if (!bullets.length) return null;
    return { lead, bullets };
  }
  if (DASH_START.test(text)) return { lead: [], bullets: [sliceRuns(line, text.search(/\S/) + 1)] };
  return null;
}

type TextPiece = { kind: "paragraph"; runs: Run[] } | { kind: "list"; items: Run[][] };

/** One text block's lines → paragraphs and bullet lists, in order. */
export function piecesFromRuns(runs: Run[]): TextPiece[] {
  const pieces: TextPiece[] = [];
  for (const line of toLines(runs)) {
    const split = splitBulletLine(line);
    if (!split) {
      // An indented second line of a bullet ("- Prevención del consumo de Tabaco," / "Alcohol y …") belongs to that bullet.
      const last = pieces[pieces.length - 1];
      const prevItem = last?.kind === "list" ? last.items[last.items.length - 1] : undefined;
      if (last?.kind === "list" && prevItem && !/[.!?:;]$/.test(runsText(prevItem).trim())) {
        last.items[last.items.length - 1] = normalizeRuns([...prevItem, { text: " " }, ...line]);
        continue;
      }
      pieces.push({ kind: "paragraph", runs: line });
      continue;
    }
    if (runsText(split.lead).trim()) pieces.push({ kind: "paragraph", runs: split.lead });
    const last = pieces[pieces.length - 1];
    if (last?.kind === "list") last.items.push(...split.bullets);
    else pieces.push({ kind: "list", items: [...split.bullets] });
  }
  return pieces;
}

function inlineRunsOf(block: Element): Run[] {
  const raw: Run[] = [];
  collectRuns(block, block, { bold: false, italic: false }, raw);
  return normalizeRuns(raw);
}

const plain = (runs: Run[]) => runs.map((r) => (r.text === "\n" ? " " : r.text)).join("").replace(/\s+/g, " ").trim();

/** Runs carry marks only when the text actually has one (keeps the stored JSON small and the tests readable). */
const hasMarks = (runs: Run[]) => runs.some((r) => r.bold || r.italic || r.href);

// ---------- block-level walk ----------

function paragraphItem(runs: Run[], box?: ItemBox, section?: number): ScrapedItem {
  const text = plain(runs);
  const whole = runs.every((r) => r.href && r.href === runs[0].href) ? runs[0].href : undefined;
  return { type: "paragraph", text, ...(hasMarks(runs) && { runs }), ...(whole && { href: whole }), ...(box && { box }), ...(section != null && { section }) };
}

function altOf(img: Element): string {
  return stripZeroWidth(img.getAttribute("alt") ?? "").replace(/\s+/g, " ").trim();
}

function imageItem(img: Element, section: number | undefined, href?: string): ScrapedItem | null {
  const src = img.getAttribute("src")?.trim();
  if (!src || !/^https?:/i.test(src) || isHidden(img)) return null;
  const box = boxOf(img);
  if (box && (box.w < 24 || box.h < 24)) return null;
  return { type: "image", src, alt: altOf(img), ...(href && { href }), ...(box && { box }), ...(section != null && { section }) };
}

function linkItem(a: Element, section: number | undefined): ScrapedItem | null {
  const url = a.getAttribute("href")?.trim();
  if (!url || url === "#" || isHidden(a)) return null;
  const text = plain(inlineRunsOf(a));
  const box = boxOf(a);
  const tail = { ...(box && { box }), ...(section != null && { section }) };
  if (DOCUMENT_URL.test(url)) return { type: "pdf", url, text, ...tail };
  return { type: "link", url, text, external: !/^https?:\/\/(www\.)?odessaseparator\.com/i.test(url), ...tail };
}

/** Wix styles body text as a heading now and then: a block of "- item" lines, or a whole sentence. Those are a list / a paragraph, not headings. */
function headingItems(h: Element, section: number | undefined): ScrapedItem[] {
  const runs = inlineRunsOf(h);
  const text = plain(runs);
  if (!text) return [];
  const box = boxOf(h);
  const tail = { ...(box && { box }), ...(section != null && { section }) };
  const pieces = piecesFromRuns(runs);
  if (pieces.some((p) => p.kind === "list")) {
    return pieces.map((piece): ScrapedItem =>
      piece.kind === "list"
        ? { type: "list", ordered: false, items: piece.items.map(plain), ...(piece.items.some(hasMarks) && { itemRuns: piece.items }), ...tail }
        : { type: "heading", level: Number(h.tagName[1]), text: plain(piece.runs), ...tail },
    );
  }
  if (text.length > 100 || (text.length > 60 && /[.!?]$/.test(text))) return [paragraphItem(normalizeRuns(runs.map((r) => (r.text === "\n" ? { text: " " } : r))), box, section)];
  const a = h.querySelector("a[href]");
  const href = a?.getAttribute("href")?.trim();
  return [{ type: "heading", level: Number(h.tagName[1]), text, ...(href && { href }), ...tail }];
}

function listItems(list: Element, section: number | undefined): ScrapedItem | null {
  const lis = Array.from(list.querySelectorAll(":scope > li")).filter((li) => !isHidden(li));
  const itemRuns = lis.map((li) => inlineRunsOf(li)).filter((r) => plain(r));
  if (!itemRuns.length) return null;
  const box = boxOf(list);
  return {
    type: "list",
    ordered: list.tagName.toLowerCase() === "ol",
    items: itemRuns.map(plain),
    ...(itemRuns.some(hasMarks) && { itemRuns }),
    ...(box && { box }),
    ...(section != null && { section }),
  };
}

/** Largest computed font size (px) among an element and its descendants; 0 when the snapshot predates `data-fs`. */
function largestFont(el: Element): number {
  let max = num(el.getAttribute("data-fs"));
  for (const d of Array.from(el.querySelectorAll("[data-fs]"))) max = Math.max(max, num(d.getAttribute("data-fs")));
  return max;
}

/** True when the element is a leaf text container (no block-level descendants to recurse into). */
function hasBlockDescendant(el: Element) {
  return Array.from(el.querySelectorAll("*")).some((d) => BLOCK_TAGS.has(d.tagName.toLowerCase()) && d !== el);
}

/** Reads the snapshot's `<main>` (or any root) in document order. */
export function extractItems(root: ParentNode): ScrapedItem[] {
  const items: ScrapedItem[] = [];
  const sections = Array.from(root.querySelectorAll("section"));
  const sectionOf = (el: Element) => {
    const s = el.closest("section");
    return s ? sections.indexOf(s) : undefined;
  };

  // The page's usual paragraph size (median over text, by length): a paragraph is only "set as a heading"
  // when it is clearly bigger than that. Machine Shop sets all of its body text large, Terms sets it at 17px.
  const sizes: number[] = [];
  for (const p of Array.from(root.querySelectorAll("p[data-fs]"))) {
    const len = stripZeroWidth(p.textContent ?? "").trim().length;
    for (let k = 0; k < Math.min(len, 400); k += 20) sizes.push(num(p.getAttribute("data-fs")));
  }
  sizes.sort((a, b) => a - b);
  const bodyFont = sizes.length ? sizes[Math.floor(sizes.length / 2)] : 16;
  const groups = new Map<Element, number>();
  const groupOf = (el: Element) => {
    const parent = el.parentElement;
    if (!parent) return undefined;
    if (!groups.has(parent)) groups.set(parent, groups.size);
    return groups.get(parent);
  };
  const walk = (el: Element) => {
    if (isHidden(el)) return;
    const tag = el.tagName.toLowerCase();
    const section = sectionOf(el);

    if (/^h[1-6]$/.test(tag)) {
      const g = groupOf(el);
      items.push(...headingItems(el, section).map((i) => ({ ...i, group: g })));
      return;
    }
    if (tag === "p") {
      const box = boxOf(el);
      const group = groupOf(el);
      // A paragraph Wix set in a heading weight and size ("SMS Terms and Conditions") is a heading.
      const pRuns = inlineRunsOf(el);
      const pText = plain(pRuns);
      if (pText && pText.length <= 80 && !pRuns.some((r) => r.text === "\n") && largestFont(el) >= Math.max(24, 1.6 * bodyFont)) {
        items.push({ type: "heading", level: 2, text: pText, ...(box && { box }), ...(section != null && { section }), group });
        return;
      }
      for (const piece of piecesFromRuns(pRuns)) {
        if (piece.kind === "paragraph") items.push({ ...paragraphItem(piece.runs, box, section), group });
        else {
          const runs = piece.items;
          items.push({ type: "list", ordered: false, items: runs.map(plain), ...(runs.some(hasMarks) && { itemRuns: runs }), ...(box && { box }), ...(section != null && { section }), group });
        }
      }
      return;
    }
    if (tag === "ul" || tag === "ol") {
      if (/social/i.test(el.getAttribute("aria-label") ?? "")) return;
      const item = listItems(el, section);
      if (item) items.push(item);
      return;
    }
    if (tag === "img") {
      const href = el.closest("a[href]")?.getAttribute("href")?.trim();
      const item = imageItem(el, section, href && href !== "#" ? href : undefined);
      if (item) items.push(item);
      return;
    }
    if (tag === "iframe") {
      const src = el.getAttribute("src") ?? "";
      const yt = src.match(/youtube\.com\/embed\/[\w-]+/);
      const box = boxOf(el);
      if (yt) items.push({ type: "video", url: src, provider: "youtube", ...(box && { box }), ...(section != null && { section }) });
      else if (src) items.push({ type: "embed", url: src, ...(box && { box }), ...(section != null && { section }) });
      return;
    }
    if (tag === "a") {
      // An anchor that is only an image is the image's link; anything else standalone is a button/document/mailto.
      const img = el.querySelector("img");
      if (img && !plain(inlineRunsOf(el))) {
        walk(img);
        return;
      }
      const item = linkItem(el, section);
      if (item) items.push(item);
      if (img) walk(img);
      return;
    }
    if (tag === "button") {
      const a = el.querySelector("a[href]");
      if (a) walk(a);
      return; // Wix ribbons ("New") and form buttons are chrome
    }
    // Text sitting directly in a div/span with no p around it.
    const direct = Array.from(el.childNodes).some((n) => n.nodeType === 3 && stripZeroWidth(n.textContent ?? "").trim());
    if (direct && !hasBlockDescendant(el)) {
      const box = boxOf(el);
      for (const piece of piecesFromRuns(inlineRunsOf(el))) {
        if (piece.kind === "paragraph") items.push(paragraphItem(piece.runs, box, section));
      }
      return;
    }
    const bg = el.getAttribute("data-bg");
    if (bg && /wixstatic\.com\/media/i.test(bg)) {
      const box = boxOf(el);
      if (!box || (box.w >= 24 && box.h >= 24)) items.push({ type: "image", src: bg, alt: "", bg: true, ...(box && { box }), ...(section != null && { section }) });
    }
    for (const child of Array.from(el.children)) walk(child);
  };

  for (const child of Array.from(root.children)) walk(child);
  return joinWrapped(dedupe(items));
}

/**
 * Wix breaks one wrapped sentence into two <p>s (the second indented with nbsp, lower-case start),
 * and one bullet list into several. Glue the continuation onto the previous item and merge neighbouring lists.
 */
export function joinWrapped(items: ScrapedItem[]): ScrapedItem[] {
  const out: ScrapedItem[] = [];
  for (const it of items) {
    const prev = out[out.length - 1];
    if (prev && it.type === "paragraph" && prev.section === it.section && /^[a-z]/.test(it.text) && !it.href) {
      if (prev.type === "list") {
        const i = prev.items.length - 1;
        const base = prev.itemRuns?.[i] ?? [{ text: prev.items[i] }];
        const add = it.runs ?? [{ text: it.text }];
        const merged = normalizeRuns([...base, { text: " " }, ...add]);
        prev.items[i] = plain(merged);
        if (prev.itemRuns || hasMarks(merged)) {
          prev.itemRuns = prev.items.map((_, k) => (k === i ? merged : (prev.itemRuns?.[k] ?? [{ text: prev.items[k] }])));
        }
        continue;
      }
      if (prev.type === "paragraph" && !/[.!?:;"”)]$/.test(prev.text)) {
        const merged = normalizeRuns([...(prev.runs ?? [{ text: prev.text }]), { text: " " }, ...(it.runs ?? [{ text: it.text }])]);
        out[out.length - 1] = { ...paragraphItem(merged, prev.box, prev.section) };
        continue;
      }
    }
    if (prev?.type === "list" && it.type === "list" && prev.ordered === it.ordered && prev.section === it.section) {
      const a = prev.itemRuns ?? prev.items.map((t) => [{ text: t }]);
      const b = it.itemRuns ?? it.items.map((t) => [{ text: t }]);
      prev.items.push(...it.items);
      if (prev.itemRuns || it.itemRuns) prev.itemRuns = [...a, ...b];
      continue;
    }
    out.push(it);
  }
  return out;
}

/** Wix renders some elements twice (desktop + mobile, or a link wrapping a link). Drops exact repeats at the same position. */
function dedupe(items: ScrapedItem[]): ScrapedItem[] {
  const seen = new Set<string>();
  return items.filter((it) => {
    const b = it.box ? `${it.box.x},${it.box.y}` : "";
    const key =
      it.type === "image"
        ? `image:${imageIdentity(it.src)}:${b}`
        : it.type === "paragraph" || it.type === "heading"
          ? `${it.type}:${it.text}:${b}`
          : it.type === "pdf" || it.type === "link"
            ? `${it.type}:${it.url}:${it.text}:${b}`
            : null;
    if (key == null) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------- reading order ----------

/**
 * Wix's DOM order is not always the visual order: in a card grid it can list
 * all three images before the three titles. Within one <section>, when items
 * form columns that sit side by side (their x-ranges do not overlap and their
 * y-ranges do), read column by column, top to bottom; otherwise keep DOM order.
 */
export function orderForReading(items: ScrapedItem[]): ScrapedItem[] {
  const out: ScrapedItem[] = [];
  const bySection = new Map<number, ScrapedItem[]>();
  const order: (number | ScrapedItem)[] = [];
  for (const it of items) {
    if (it.section == null) {
      order.push(it);
      continue;
    }
    if (!bySection.has(it.section)) {
      bySection.set(it.section, []);
      order.push(it.section);
    }
    bySection.get(it.section)!.push(it);
  }
  for (const entry of order) {
    if (typeof entry !== "number") out.push(entry);
    else out.push(...orderSection(bySection.get(entry)!));
  }
  return mergeSameLine(out);
}

/**
 * Wix sets one sentence as two text boxes on the same line ("…email x@y.com or"
 * + "follow this link…"). Two single-line paragraphs that share a baseline and
 * touch horizontally read as one paragraph; taller ones are real columns.
 */
export function mergeSameLine(items: ScrapedItem[]): ScrapedItem[] {
  const out: ScrapedItem[] = [];
  for (const it of items) {
    const prev = out[out.length - 1];
    if (
      prev?.type === "paragraph" && it.type === "paragraph" && prev.box && it.box &&
      prev.section === it.section && prev.group !== it.group && prev.box.h < 45 && it.box.h < 45 &&
      Math.abs(prev.box.y - it.box.y) < 5 && it.box.x >= prev.box.x &&
      // The boxes overlap (Wix sized the first one too wide) and the second continues the sentence.
      it.box.x <= prev.box.x + prev.box.w && /^[a-z]/.test(it.text)
    ) {
      const a = prev.runs ?? [{ text: prev.text, ...(prev.href && { href: prev.href }) }];
      const b = it.runs ?? [{ text: it.text, ...(it.href && { href: it.href }) }];
      const runs = normalizeRuns([...a, { text: " " }, ...b]);
      out[out.length - 1] = { ...paragraphItem(runs, { x: prev.box.x, y: prev.box.y, w: it.box.x + it.box.w - prev.box.x, h: prev.box.h }, prev.section) };
    } else out.push(it);
  }
  return out;
}

/** Top to bottom; items whose tops are within 12px share a row and read left to right. */
function byRows(items: ScrapedItem[]): ScrapedItem[] {
  return items
    .map((it, i) => ({ it, i, row: Math.round(it.box!.y / 12) }))
    .sort((a, b) => a.it.box!.y - b.it.box!.y || a.i - b.i)
    .reduce<{ it: ScrapedItem; i: number; row: number }[][]>((rows, e) => {
      const last = rows[rows.length - 1];
      if (last && Math.abs(last[0].it.box!.y - e.it.box!.y) < 12) last.push(e);
      else rows.push([e]);
      return rows;
    }, [])
    .flatMap((r) => r.sort((a, b) => a.it.box!.x - b.it.box!.x).map((e) => e.it));
}

function orderSection(items: ScrapedItem[]): ScrapedItem[] {
  const boxed = items.filter((i) => i.box && i.box.w > 0);
  if (boxed.length !== items.length || items.length < 2) return items;
  // Cluster into columns by x-overlap (items spanning the full width belong to no column and break the section into bands).
  const sorted = [...items].sort((a, b) => a.box!.x - b.box!.x);
  const cols: ScrapedItem[][] = [];
  const spans: { from: number; to: number }[] = [];
  for (const it of sorted) {
    const from = it.box!.x;
    const to = it.box!.x + it.box!.w;
    const hit = spans.findIndex((s) => from < s.to - 8 && to > s.from + 8);
    if (hit >= 0) {
      cols[hit].push(it);
      spans[hit] = { from: Math.min(spans[hit].from, from), to: Math.max(spans[hit].to, to) };
    } else {
      cols.push([it]);
      spans.push({ from, to });
    }
  }
  if (cols.length < 2) return byRows(items);
  // Real columns overlap vertically; a layout that is only stacked rows with different x offsets does not.
  const ys = cols.map((c) => ({ from: Math.min(...c.map((i) => i.box!.y)), to: Math.max(...c.map((i) => i.box!.y + i.box!.h)) }));
  const sideBySide = ys.some((a, i) => ys.some((b, j) => j > i && a.from < b.to - 8 && b.from < a.to - 8));
  if (!sideBySide) return byRows(items);
  return cols
    .sort((a, b) => a[0].box!.x - b[0].box!.x)
    .flatMap((c) => c.sort((a, b) => a.box!.y - b.box!.y || a.box!.x - b.box!.x));
}
