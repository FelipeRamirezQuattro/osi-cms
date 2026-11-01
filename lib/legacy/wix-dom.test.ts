import { describe, expect, it } from "vitest";
import { extractItems, mergeSameLine, normalizeRuns, orderForReading, piecesFromRuns } from "./wix-dom";
import type { ScrapedItem } from "./clean";

/** Parses a snippet the way the snapshot stores it (attributes data-fw/data-box/... are what the browser recorded). */
const read = (html: string): ScrapedItem[] => {
  const root = document.createElement("div");
  root.innerHTML = html;
  return extractItems(root);
};

describe("inline runs keep their spacing (QA: glued words)", () => {
  it("re-joins a link ending in nbsp with the word after it", () => {
    // Hiring: <a>svyas@odsep.com&nbsp;</a>or
    const [p] = read(
      `<p data-fw="400"><span>Please reach out to email </span><span><a href="mailto:svyas@odsep.com">svyas@odsep.com&nbsp;</a>or</span></p>`,
    );
    expect(p).toMatchObject({ type: "paragraph", text: "Please reach out to email svyas@odsep.com or" });
  });

  it("keeps a mailto link as a link run, not plain text", () => {
    const [p] = read(`<p data-fw="400">Email: <span><a href="mailto:svyas@odsep.com">svyas@odsep.com</a></span></p>`);
    expect(p.type === "paragraph" && p.runs).toEqual([
      { text: "Email: " },
      { text: "svyas@odsep.com", href: "mailto:svyas@odsep.com" },
    ]);
  });

  it("joins spans split across a nbsp (SEXUAL&nbsp;EN EL TRABAJO)", () => {
    const [p] = read(`<p data-fw="400"><span><span>SEXUAL&nbsp;</span></span><span><span>EN EL TRABAJO​</span></span></p>`);
    expect(p).toMatchObject({ text: "SEXUAL EN EL TRABAJO" });
  });

  it("does not double a space that sits on both sides of a run boundary", () => {
    expect(normalizeRuns([{ text: "control " }, { text: " systems", bold: true }]).map((r) => r.text).join("")).toBe("control systems");
  });

  it("splits a link wrapped over nested spans without breaking the word (f + ollow)", () => {
    const [p] = read(`<p><a href="/careers#employmentapplication"><span><span>f</span></span><span><span>ollow this link</span></span></a></p>`);
    expect(p).toMatchObject({ text: "follow this link", href: "/careers#employmentapplication" });
  });
});

describe("bold and italic come from the computed style", () => {
  it("marks a span heavier than its paragraph as bold (Privacy Policy section titles)", () => {
    const [p] = read(`<p data-fw="400"><span data-fw="700">Information We Collect</span></p>`);
    expect(p.type === "paragraph" && p.runs).toEqual([{ text: "Information We Collect", bold: true }]);
  });

  it("does not mark text that is only as heavy as its own block", () => {
    const [p] = read(`<p data-fw="700"><span data-fw="700">Already heavy</span></p>`);
    expect(p.type === "paragraph" && p.runs).toBeUndefined();
  });

  it("keeps italic", () => {
    const [p] = read(`<p data-fw="400">Sales <span data-fi="1">Manager</span></p>`);
    expect(p.type === "paragraph" && p.runs?.[1]).toEqual({ text: "Manager", italic: true });
  });
});

describe("text-drawn bullets become lists", () => {
  it("turns Wix's inline • characters separated by <br> into a bullet list (Hiring)", () => {
    const items = read(
      `<p><span>•⁠ &nbsp;⁠Develop and execute sales strategies.<br> •⁠ &nbsp;⁠ Work assignments carried out on time.<br> •⁠ &nbsp;⁠ Establish good communication.</span></p>`,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "list",
      items: ["Develop and execute sales strategies.", "Work assignments carried out on time.", "Establish good communication."],
    });
  });

  it("splits bullets that share one line", () => {
    const pieces = piecesFromRuns(normalizeRuns([{ text: "Needs: • one • two" }]));
    expect(pieces).toHaveLength(2);
    expect(pieces[0]).toMatchObject({ kind: "paragraph" });
    expect(pieces[1]).toMatchObject({ kind: "list", items: [[{ text: "one" }], [{ text: "two" }]] });
  });

  it("reads ✔ lines (Pump Cards) and joins the wrapped continuation onto its bullet", () => {
    const items = read(
      `<p><span>✔ Pump Efficiency – Monitor key metrics.<br> ✔ Early Failure Detection – Identify issues like fluid pound, or mechanical </span></p>` +
        `<p><span>&nbsp; &nbsp; failures before they impact production.<br> ✔ Optimized Production – Adjust pump settings.</span></p>`,
    );
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      type: "list",
      items: [
        "Pump Efficiency – Monitor key metrics.",
        "Early Failure Detection – Identify issues like fluid pound, or mechanical failures before they impact production.",
        "Optimized Production – Adjust pump settings.",
      ],
    });
  });

  it('reads "- item" lines inside an h3 as a list, not a 400-character heading', () => {
    const items = read(`<h3><span>- Advanced Diagnostics – Detailed.<br> - Expert Analysis – Our team.</span></h3>`);
    expect(items[0]).toMatchObject({ type: "list", items: ["Advanced Diagnostics – Detailed.", "Expert Analysis – Our team."] });
  });

  it("keeps an indented second line with its dash bullet (SG-SST)", () => {
    const items = read(
      `<h2><span>Política</span><br><br><span>- Estilos de Vida Saludable.<br> - &nbsp;Prevención del consumo de Tabaco,<br> &nbsp; &nbsp;Alcohol y Sustancias Psicoactivas.<br> - &nbsp;Interna de Teletrabajo.</span></h2>`,
    );
    expect(items[0]).toMatchObject({ type: "heading", text: "Política" });
    expect(items[1]).toMatchObject({
      type: "list",
      items: ["Estilos de Vida Saludable.", "Prevención del consumo de Tabaco, Alcohol y Sustancias Psicoactivas.", "Interna de Teletrabajo."],
    });
  });

  it("reads a real <ul> and keeps bold labels", () => {
    const [list] = read(`<ul><li data-fw="400"><span data-fw="700">Real-time Data:</span> Continuous tracking.</li><li>Second</li></ul>`);
    expect(list).toMatchObject({ type: "list", items: ["Real-time Data: Continuous tracking.", "Second"] });
    expect(list.type === "list" && list.itemRuns?.[0][0]).toEqual({ text: "Real-time Data:", bold: true });
  });
});

describe("headings stay separate", () => {
  it("does not merge adjacent headings (Machine Shop)", () => {
    const items = read(`<h2>PLASMA CUTTING</h2><h2>TURNING CENTERS</h2><h2>VERTICAL MACHINING CENTERS</h2>`);
    expect(items.map((i) => i.type === "heading" && i.text)).toEqual(["PLASMA CUTTING", "TURNING CENTERS", "VERTICAL MACHINING CENTERS"]);
  });

  it("turns a sentence set in a heading element into a paragraph", () => {
    const [p] = read(
      `<h3>Boost your well performance with OSI’s Pump Card service! Contact us today to learn how our expertise can help optimize your artificial lift system.</h3>`,
    );
    expect(p.type).toBe("paragraph");
  });

  it("makes a large short paragraph a heading (SMS Terms and Conditions)", () => {
    const items = read(
      `<p data-fs="17">By accessing the Service You agree to be bound by these Terms and Conditions, and the Company may change them at any time.</p>` +
        `<p data-fs="40" data-fw="400" data-box="0,0,964,58"><span data-fs="40">SMS Terms and Conditions</span></p>`,
    );
    expect(items[1]).toMatchObject({ type: "heading", text: "SMS Terms and Conditions" });
  });

  it("keeps big text a paragraph when the whole page is set big (Machine Shop)", () => {
    const items = read(
      `<p data-fs="30">Diameters up 30 and lengths up to 160 for every job we take on.</p>` +
        `<p data-fs="30" data-box="0,0,766,41"><span data-fs="30">These machines can be capable of facing, threading,</span></p>` +
        `<p data-fs="30">knurling, drilling, boring, reaming, and taper turning.</p>`,
    );
    expect(items.every((i) => i.type === "paragraph")).toBe(true);
  });

  it("keeps a link wrapped around a heading's text", () => {
    const [h] = read(`<h2><a href="https://www.odessaseparator.com/general-8"><span>FLUID LEVELS</span></a></h2>`);
    expect(h).toMatchObject({ type: "heading", text: "FLUID LEVELS", href: "https://www.odessaseparator.com/general-8" });
  });
});

describe("links, files and images", () => {
  it("reads a document button as a pdf item with its label", () => {
    const [pdf] = read(`<a href="https://www.odessaseparator.com/_files/ugd/1ac9e9_a02f.pdf" target="_blank"><span><span>Documento</span></span></a>`);
    expect(pdf).toMatchObject({ type: "pdf", text: "Documento", url: "https://www.odessaseparator.com/_files/ugd/1ac9e9_a02f.pdf" });
  });

  it("reads a mailto button as a link", () => {
    const [link] = read(`<a href="mailto:ctrujillo@odsep.com"><span>Descargar y enviar al correo ctrujillo@odsep.com</span></a>`);
    expect(link).toMatchObject({ type: "link", url: "mailto:ctrujillo@odsep.com" });
  });

  it("keeps an image with its alt text and the link it sits in", () => {
    const [img] = read(
      `<a href="https://www.odessaseparator.com/machine-shop"><img src="https://static.wixstatic.com/media/a~mv2.jpg/v1/fill/w_1,h_1/a.jpg" alt="Machine shop" data-box="0,0,400,300"></a>`,
    );
    expect(img).toMatchObject({ type: "image", alt: "Machine shop", href: "https://www.odessaseparator.com/machine-shop" });
  });

  it("drops icons and hidden duplicates", () => {
    expect(read(`<img src="https://static.wixstatic.com/media/i.png" data-box="0,0,16,16"><img src="https://static.wixstatic.com/media/b.png" data-hidden="1">`)).toEqual([]);
  });

  it("keeps the careers job-board iframe as an embed", () => {
    const [e] = read(`<iframe src="https://www-odessaseparator-com.filesusr.com/html/20719f_6945.html"></iframe>`);
    expect(e).toMatchObject({ type: "embed" });
  });

  it("skips the Wix 'New' ribbon button and the social bar", () => {
    expect(read(`<button aria-label="New"><span>New</span></button><ul aria-label="Social Bar"><li><a href="https://x"></a></li></ul>`)).toEqual([]);
  });
});

describe("reading order", () => {
  const box = (x: number, y: number, w: number, h: number) => ({ x, y, w, h });
  it("joins two single-line text boxes that continue one sentence (Hiring: 'or' + 'follow this link')", () => {
    const merged = mergeSameLine([
      { type: "paragraph", text: "Please reach out to email svyas@odsep.com or", box: box(248, 366, 445, 29), section: 0, group: 1 },
      { type: "paragraph", text: "follow this link to send your resume", href: "/careers#employmentapplication", box: box(651, 366, 304, 29), section: 0, group: 2 },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ text: "Please reach out to email svyas@odsep.com or follow this link to send your resume" });
  });

  it("does not merge two people's cards that sit side by side", () => {
    const out = mergeSameLine([
      { type: "paragraph", text: "Gustavo Gonzalez", box: box(425, 139, 269, 27), section: 0, group: 1 },
      { type: "paragraph", text: "Luis Guanacas", box: box(707, 139, 269, 27), section: 0, group: 2 },
    ]);
    expect(out).toHaveLength(2);
  });

  it("reads columns side by side one column at a time (About Us: VISION | MISSION)", () => {
    const items: ScrapedItem[] = [
      { type: "heading", level: 2, text: "VISION", box: box(230, 99, 475, 67), section: 0 },
      { type: "paragraph", text: "vision text", box: box(230, 168, 475, 120), section: 0 },
      { type: "heading", level: 2, text: "MISSION", box: box(736, 99, 475, 67), section: 0 },
      { type: "paragraph", text: "mission text", box: box(736, 168, 475, 168), section: 0 },
    ];
    const reordered = orderForReading(items).map((i) => (i.type === "heading" || i.type === "paragraph" ? i.text : ""));
    expect(reordered).toEqual(["VISION", "vision text", "MISSION", "mission text"]);
  });

  it("orders stacked cards top to bottom even when the DOM lists a title after the next card's image (Services)", () => {
    const items: ScrapedItem[] = [
      { type: "image", src: "https://static.wixstatic.com/media/a", alt: "", box: box(230, 589, 490, 258), section: 1 },
      { type: "paragraph", text: "Maximize Pump Efficiency", box: box(508, 870, 390, 21), section: 1 },
      { type: "heading", level: 2, text: "PUMP CARDS", box: box(244, 850, 264, 63), section: 1 },
      { type: "image", src: "https://static.wixstatic.com/media/b", alt: "", box: box(230, 912, 424, 282), section: 1 },
    ];
    expect(orderForReading(items).map((i) => (i.type === "image" ? "img" : i.type === "heading" ? i.text : i.type === "paragraph" ? i.text : ""))).toEqual([
      "img",
      "PUMP CARDS",
      "Maximize Pump Efficiency",
      "img",
    ]);
  });
});
