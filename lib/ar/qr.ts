import QRCode from "qrcode";

/**
 * SVG markup (not a canvas-based data URI — see lib/ar/qr.test.ts's
 * comment) encoding `text` as a QR code. Used by the ar_model block to
 * let a desktop visitor scan through to the same page on their phone,
 * where AR can actually launch.
 */
export async function generateQrCodeSvg(text: string): Promise<string> {
  return QRCode.toString(text, { type: "svg", margin: 1, width: 160 });
}
