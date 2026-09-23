import QRCode from "qrcode";

/**
 * SVG markup (not a canvas-based data URI) encoding `text` as a QR code.
 * SVG output is pure string generation with no `<canvas>` 2D context
 * dependency, so it works identically in Node (this file's own tests,
 * run under Vitest/jsdom, which doesn't implement canvas without the
 * separate `canvas` npm package) and in the browser (production). Used
 * by the ar_model block to let a desktop visitor scan through to the
 * same page on their phone, where AR can actually launch.
 *
 * No `width` option is passed — the SVG's natural `viewBox`-based sizing
 * scales cleanly via CSS at the call site instead of forcing a fixed
 * pixel size that could overflow its wrapper.
 */
export async function generateQrCodeSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 1 });
}
