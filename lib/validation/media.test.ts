import { describe, expect, it } from "vitest";
import { mediaUploadSchema } from "@/lib/validation/media";

describe("mediaUploadSchema", () => {
  it("accepts real alt text", () => {
    expect(mediaUploadSchema.safeParse({ alt: "A red gas release valve" }).success).toBe(true);
  });

  it("rejects blank, whitespace-only, or missing alt text", () => {
    expect(mediaUploadSchema.safeParse({ alt: "" }).success).toBe(false);
    expect(mediaUploadSchema.safeParse({ alt: "   " }).success).toBe(false);
    expect(mediaUploadSchema.safeParse({}).success).toBe(false);
  });

  it("rejects a non-string alt value (e.g. a File slipping through formData.get)", () => {
    expect(mediaUploadSchema.safeParse({ alt: new File(["x"], "x.txt") }).success).toBe(false);
  });
});
