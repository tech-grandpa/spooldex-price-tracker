import { describe, expect, it } from "vitest";
import { selectMatchingCandidate } from "@/lib/scrapers/offer-matching";
import type { ExistingOfferInput, ScrapedOfferCandidate } from "@/lib/scrapers/types";

function buildOffer(overrides: Partial<ExistingOfferInput> = {}): ExistingOfferInput {
  return {
    id: "offer-1",
    shopId: "shop-1",
    externalId: "variant-2",
    url: "https://example.com/products/pla?variant=2&utm_source=tracker",
    affiliateUrl: "https://example.com/products/pla?variant=2&utm_source=tracker",
    title: "PLA Basic Black",
    imageUrl: null,
    packType: "single",
    spoolCount: 1,
    totalWeightG: 1000,
    etag: null,
    lastModifiedHeader: null,
    latestPriceCents: 1999,
    latestCurrency: "EUR",
    latestInStock: true,
    sourceConfidence: 0.8,
    ...overrides,
  };
}

function buildCandidate(overrides: Partial<ScrapedOfferCandidate> = {}): ScrapedOfferCandidate {
  return {
    externalId: "variant-1",
    title: "PLA Basic White",
    url: "https://example.com/products/pla?variant=1",
    affiliateUrl: "https://example.com/products/pla?variant=1",
    imageUrl: null,
    priceCents: 2099,
    currency: "EUR",
    inStock: true,
    packType: "single",
    spoolCount: 1,
    totalWeightG: 1000,
    sourceConfidence: 0.75,
    ean: null,
    ...overrides,
  };
}

describe("offer matching", () => {
  it("prefers external id matches", () => {
    const selected = selectMatchingCandidate(buildOffer(), [
      buildCandidate({ externalId: "variant-1" }),
      buildCandidate({ externalId: "variant-2", title: "PLA Basic Black", url: "https://example.com/products/pla?variant=2" }),
    ]);

    expect(selected?.externalId).toBe("variant-2");
  });

  it("falls back to canonical product urls when affiliate params differ", () => {
    const selected = selectMatchingCandidate(buildOffer({ externalId: null }), [
      buildCandidate({
        externalId: "variant-9",
        title: "PLA Basic Black",
        url: "https://example.com/products/pla?variant=2",
      }),
    ]);

    expect(selected?.url).toBe("https://example.com/products/pla?variant=2");
  });
});
