import { describe, expect, it } from "vitest";
import { legacyAssetPath, publicAssetUrl } from "./asset-path";

describe("legacyAssetPath", () => {
  it("is deterministic and filesystem-safe", () => {
    const u = "https://static.wixstatic.com/media/1ac9e9_33dae9e7564940889765ff42eccf8c3b~mv2.png";
    expect(legacyAssetPath(u)).toBe(legacyAssetPath(u));
    expect(legacyAssetPath(u)).toMatch(/^legacy-pages\/[0-9a-f]{10}-1ac9e9_33dae9e7564940889765ff42eccf8c3b\.png$/);
  });
  it("keeps two sources with the same file name apart", () => {
    expect(legacyAssetPath("https://a.test/x/logo.png")).not.toBe(legacyAssetPath("https://b.test/x/logo.png"));
  });
  it("builds the public bucket URL", () => {
    expect(publicAssetUrl("https://p.supabase.co/", "https://a.test/f.pdf")).toMatch(/^https:\/\/p\.supabase\.co\/storage\/v1\/object\/public\/media\/legacy-pages\/.+-f\.pdf$/);
  });
});
