import { describe, expect, it } from "vitest";
import { classifyScanCode, normalizeToEan13 } from "@/lib/scan-code";

describe("classifyScanCode", () => {
  it("classifies EAN-13 (13 digits)", () => {
    expect(classifyScanCode("4260712340123")).toEqual({ ean: "4260712340123" });
  });

  it("classifies UPC-A (12 digits) and normalizes to EAN-13", () => {
    expect(classifyScanCode("260712340123")).toEqual({ ean: "0260712340123" });
  });

  it("classifies GTIN-14 (14 digits)", () => {
    expect(classifyScanCode("14260712340123")).toEqual({ ean: "14260712340123" });
  });

  it("classifies EAN-8 (8 digits)", () => {
    expect(classifyScanCode("12345678")).toEqual({ ean: "12345678" });
  });

  it("classifies URL with filament slug", () => {
    expect(classifyScanCode("https://spooldex-tracker.acgt.dev/filaments/polymaker-polyterra-pla-army-green")).toEqual({
      slug: "polymaker-polyterra-pla-army-green",
    });
  });

  it("classifies URL with locale prefix", () => {
    expect(classifyScanCode("https://spooldex-tracker.acgt.dev/en/filaments/bambu-lab-pla-basic-black")).toEqual({
      slug: "bambu-lab-pla-basic-black",
    });
  });

  it("classifies Bambu Lab code", () => {
    expect(classifyScanCode("GFL99-01")).toEqual({ bambuCode: "GFL99-01" });
  });

  it("classifies lowercase Bambu code and uppercases it", () => {
    expect(classifyScanCode("gfa00-02")).toEqual({ bambuCode: "GFA00-02" });
  });

  it("returns empty for unrecognized values", () => {
    expect(classifyScanCode("random-text")).toEqual({});
  });

  it("handles whitespace around scan codes", () => {
    expect(classifyScanCode("  4260712340123  ")).toEqual({ ean: "4260712340123" });
  });

  it("returns empty for URL without filament path", () => {
    expect(classifyScanCode("https://example.com/about")).toEqual({});
  });
});

describe("normalizeToEan13", () => {
  it("prepends 0 to 12-digit UPC-A", () => {
    expect(normalizeToEan13("260712340123")).toBe("0260712340123");
  });

  it("returns 13-digit EAN-13 unchanged", () => {
    expect(normalizeToEan13("4260712340123")).toBe("4260712340123");
  });

  it("strips whitespace before normalizing", () => {
    expect(normalizeToEan13("  260712340123  ")).toBe("0260712340123");
  });

  it("returns non-numeric codes unchanged", () => {
    expect(normalizeToEan13("GFL99-01")).toBe("GFL99-01");
  });
});
