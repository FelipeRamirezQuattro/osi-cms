import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stateless confirm/unsubscribe tokens: `<subscriberId>.<hmac>`, where the
 * HMAC covers a purpose label plus the id. Nothing is stored, so an
 * unsubscribe link can be re-derived for every campaign email (a hashed,
 * one-time token could not), and a confirm token can't be replayed as an
 * unsubscribe token or vice versa. Both actions are idempotent, so the
 * lack of expiry/single-use is harmless.
 *
 * `NEWSLETTER_TOKEN_SECRET` must be set (long random string). Without it
 * nothing can be signed, so signup fails closed rather than sending links
 * that can't be verified — see createSubscriberToken's return value.
 */
export type TokenPurpose = "confirm" | "unsubscribe";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function sign(purpose: TokenPurpose, subscriberId: string, secret: string): string {
  return createHmac("sha256", secret).update(`${purpose}:${subscriberId}`).digest("base64url");
}

export function isTokenSecretConfigured(): boolean {
  return Boolean(process.env.NEWSLETTER_TOKEN_SECRET);
}

/** Returns null when NEWSLETTER_TOKEN_SECRET is unset. */
export function createSubscriberToken(purpose: TokenPurpose, subscriberId: string): string | null {
  const secret = process.env.NEWSLETTER_TOKEN_SECRET;
  if (!secret) return null;
  return `${subscriberId}.${sign(purpose, subscriberId, secret)}`;
}

/** Returns the subscriber id when the token is authentic for `purpose`, else null. */
export function verifySubscriberToken(purpose: TokenPurpose, token: string | null | undefined): string | null {
  const secret = process.env.NEWSLETTER_TOKEN_SECRET;
  if (!secret || !token) return null;
  const dot = token.indexOf(".");
  if (dot === -1) return null;
  const id = token.slice(0, dot);
  const provided = Buffer.from(token.slice(dot + 1));
  if (!UUID.test(id)) return null;
  const expected = Buffer.from(sign(purpose, id, secret));
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  return id;
}
