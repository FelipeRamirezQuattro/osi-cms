import { createSign } from "node:crypto";

// Hand-rolled RS256 JWT signing + OAuth2 token exchange for a Google
// service account — see docs/DECISIONS.md for why this doesn't pull in
// the `googleapis` package for what's really two REST calls.

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const JWT_LIFETIME_SECONDS = 3600;

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function createSignedJwt(params: {
  serviceAccountEmail: string;
  privateKeyPem: string;
  scope: string;
  /** Seconds since epoch — injectable for tests; defaults to the real current time. */
  now?: number;
}): string {
  const now = params.now ?? Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const claims = {
    iss: params.serviceAccountEmail,
    scope: params.scope,
    aud: TOKEN_URL,
    iat: now,
    exp: now + JWT_LIFETIME_SECONDS,
  };

  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;
  const signature = createSign("RSA-SHA256").update(signingInput).sign(params.privateKeyPem);

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

/**
 * Exchanges a freshly-signed JWT for an access token. Caches in module
 * scope for the lifetime of a warm serverless instance — a minor
 * optimization, never relied on for correctness (a cold start or expired
 * cache just re-fetches).
 */
export async function getSearchConsoleAccessToken(params: {
  serviceAccountEmail: string;
  privateKeyPem: string;
  scope: string;
}): Promise<string> {
  const nowMs = Date.now();
  if (cachedToken && cachedToken.expiresAt > nowMs) {
    return cachedToken.accessToken;
  }

  const assertion = createSignedJwt(params);
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google token exchange failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    accessToken: data.access_token,
    // Shave 60s off the real expiry so a near-boundary call never uses a
    // token Google is about to reject.
    expiresAt: nowMs + (data.expires_in - 60) * 1000,
  };
  return cachedToken.accessToken;
}
