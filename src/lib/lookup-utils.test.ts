import { describe, expect, it } from "vitest";
import { buildLookupFilamentName, compareLookupOfferOrder, getSimilarFilamentScore } from "@/lib/lookup-utils";

describe("lookup utils", () => {
  it("sorts offers by price and then affiliate availability", () => {
    const offers = [
      { priceCents: 1999, affiliateUrl: null },
      { priceCents: 1899, affiliateUrl: null },
      { priceCents: 1999, affiliateUrl: "https://example.com/affiliate" },
    ];

    const sorted = [...offers].sort(compareLookupOfferOrder);
    expect(sorted).toEqual([
      { priceCents: 1899, affiliateUrl: null },
      { priceCents: 1999, affiliateUrl: "https://example.com/affiliate" },
      { priceCents: 1999, affiliateUrl: null },
    ]);
  });

  it("builds a lookup display name from series and color", () => {
    expect(buildLookupFilamentName({
      series: "PLA Basic",
      material: "PLA",
      colorName: "Jade White",
    })).toBe("PLA Basic Jade White");
  });

  it("scores closer colors higher", () => {
    const target = {
      brand: "Bambu Lab",
      series: "PLA Basic",
      material: "PLA",
      colorName: "Jade White",
      colorHex: "#DDE9D4",
    };

    const similar = {
      brand: "Prusament",
      series: "PLA",
      material: "PLA",
      colorName: "Jade White",
      colorHex: "#D8E4CF",
    };

    const distant = {
      brand: "Prusament",
      series: "PLA",
      material: "PLA",
      colorName: "Jet Black",
      colorHex: "#111111",
    };

    expect(getSimilarFilamentScore(target, similar)).toBeGreaterThan(getSimilarFilamentScore(target, distant));
  });
});
