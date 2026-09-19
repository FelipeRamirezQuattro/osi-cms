import { generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createSignedJwt } from "@/lib/google/service-account-auth";

function generateTestKeyPair() {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });
  return { publicKey, privateKey };
}

function base64UrlDecode(segment: string): Buffer {
  const padded = segment.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64");
}

describe("createSignedJwt", () => {
  it("produces a three-segment JWT with a valid RS256 signature over the header and claims", () => {
    const { publicKey, privateKey } = generateTestKeyPair();

    const jwt = createSignedJwt({
      serviceAccountEmail: "test@example.iam.gserviceaccount.com",
      privateKeyPem: privateKey,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      now: 1700000000,
    });

    const parts = jwt.split(".");
    expect(parts).toHaveLength(3);

    const [headerPart, claimsPart, signaturePart] = parts;
    const signingInput = `${headerPart}.${claimsPart}`;
    const isValid = verify(
      "RSA-SHA256",
      Buffer.from(signingInput),
      publicKey,
      base64UrlDecode(signaturePart),
    );
    expect(isValid).toBe(true);
  });

  it("encodes the expected header and claims", () => {
    const { privateKey } = generateTestKeyPair();

    const jwt = createSignedJwt({
      serviceAccountEmail: "test@example.iam.gserviceaccount.com",
      privateKeyPem: privateKey,
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      now: 1700000000,
    });

    const [headerPart, claimsPart] = jwt.split(".");
    const header = JSON.parse(base64UrlDecode(headerPart).toString("utf8"));
    const claims = JSON.parse(base64UrlDecode(claimsPart).toString("utf8"));

    expect(header).toEqual({ alg: "RS256", typ: "JWT" });
    expect(claims).toEqual({
      iss: "test@example.iam.gserviceaccount.com",
      scope: "https://www.googleapis.com/auth/webmasters.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: 1700000000,
      exp: 1700003600,
    });
  });
});
