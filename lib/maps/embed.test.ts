import { describe, expect, it } from "vitest";
import { extractIframeSrc, googleMapsEmbedSrc } from "@/lib/maps/embed";
import { toEmbedSrc } from "@/components/blocks/embed";

const src = (url: string) => googleMapsEmbedSrc(new URL(url));
const params = (url: string | null) => Object.fromEntries(new URL(url!).searchParams);

describe("googleMapsEmbedSrc", () => {
  it("converts a copied /maps/place/<name>/@lat,lng,z/data=… URL (QA's C9 case)", () => {
    const out = src(
      "https://www.google.com/maps/place/Odessa+Separator+Inc/@31.8486,-102.3677,17z/data=!3m1!4b1!4m6!3m5!1s0x86c2d5:0x1!8m2!3d31.8486!4d-102.3677!16s%2Fg%2F1tdyqw3_?entry=ttu",
    );
    expect(out).toMatch(/^https:\/\/www\.google\.com\/maps\?/);
    expect(params(out)).toEqual({ q: "Odessa Separator Inc", ll: "31.8486,-102.3677", z: "17", output: "embed" });
  });

  it("converts /maps/place/<name> with no coordinates", () => {
    expect(params(src("https://www.google.com/maps/place/1001+E+Pearl+Street,+Odessa,+TX"))).toEqual({
      q: "1001 E Pearl Street, Odessa, TX",
      output: "embed",
    });
  });

  it("converts /maps/search/<query>", () => {
    expect(params(src("https://www.google.com/maps/search/oil+field+equipment+Odessa+TX/@31.8,-102.3,12z"))).toEqual({
      q: "oil field equipment Odessa TX",
      output: "embed",
    });
  });

  it("converts ?q= and ?query= forms", () => {
    expect(params(src("https://maps.google.com/?q=1001+E+Pearl+St+Odessa+TX"))).toEqual({
      q: "1001 E Pearl St Odessa TX",
      output: "embed",
    });
    expect(params(src("https://www.google.com/maps?q=Odessa+Separator&ll=31.8,-102.3"))).toMatchObject({
      q: "Odessa Separator",
      ll: "31.8,-102.3",
      output: "embed",
    });
    expect(params(src("https://www.google.com/maps/search/?api=1&query=1001+E+Pearl+St+Odessa"))).toMatchObject({
      q: "1001 E Pearl St Odessa",
    });
  });

  it("converts /maps/@lat,lng,z", () => {
    expect(params(src("https://www.google.com/maps/@31.8486,-102.3677,15z"))).toEqual({
      ll: "31.8486,-102.3677",
      z: "15",
      output: "embed",
    });
  });

  it("passes the 'Embed a map' src through unchanged", () => {
    const embed = "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3000!2d-102.3!3d31.8";
    expect(src(embed)).toBe(embed);
  });

  it("returns null for shapes it can't convert", () => {
    expect(src("https://www.google.com/maps/dir/Odessa/Midland")).toBeNull();
    expect(src("https://www.google.com/search?q=odessa")).toBeNull();
    expect(src("https://www.google.com/maps")).toBeNull();
  });
});

describe("toEmbedSrc (google_maps)", () => {
  it("never frames a short link or another host", () => {
    expect(toEmbedSrc("google_maps", "https://maps.app.goo.gl/AbCdEf123")).toBeNull();
    expect(toEmbedSrc("google_maps", "https://goo.gl/maps/AbCdEf123")).toBeNull();
    expect(toEmbedSrc("google_maps", "https://evil.example/maps/place/x")).toBeNull();
  });

  it("converts a pasted place URL", () => {
    expect(toEmbedSrc("google_maps", "https://www.google.com/maps/place/Odessa+Separator+Inc/@31.8,-102.3,17z/data=!3m1")).toContain(
      "output=embed",
    );
  });
});

const SNIPPET =
  '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3389.1!2d-102.36!3d31.85!5e0!3m2!1ses-419!2sco!4v1792543214643!5m2!1ses-419!2sco" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>';

describe("extractIframeSrc", () => {
  it("takes the src out of a pasted Embed-a-map snippet", () => {
    const src = extractIframeSrc(SNIPPET);
    expect(src).toBe("https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3389.1!2d-102.36!3d31.85!5e0!3m2!1ses-419!2sco!4v1792543214643!5m2!1ses-419!2sco");
    expect(toEmbedSrc("google_maps", src as string)).toBe(src);
  });

  it("decodes &amp; and accepts single quotes", () => {
    expect(extractIframeSrc("<iframe src='https://www.google.com/maps?q=a&amp;ll=1,2'></iframe>")).toBe("https://www.google.com/maps?q=a&ll=1,2");
  });

  it("leaves plain URLs, blanks and non-strings alone", () => {
    expect(extractIframeSrc("https://maps.app.goo.gl/x")).toBe("https://maps.app.goo.gl/x");
    expect(extractIframeSrc("")).toBe("");
    expect(extractIframeSrc(null)).toBeNull();
  });

  it("does not make an unsafe snippet safe — the src is still validated downstream", () => {
    expect(extractIframeSrc('<iframe src="javascript:alert(1)"></iframe>')).toBe("javascript:alert(1)");
    expect(toEmbedSrc("google_maps", "https://evil.example/maps/embed?pb=1")).toBeNull();
  });
});
