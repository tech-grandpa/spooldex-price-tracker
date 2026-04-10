export interface ScrapedOfferCandidate {
  externalId: string;
  title: string;
  url: string;
  affiliateUrl: string;
  imageUrl: string | null;
  priceCents: number | null;
  currency: string;
  inStock: boolean;
  packType: string;
  spoolCount: number;
  totalWeightG: number | null;
  sourceConfidence: number;
  ean: string | null;
}

export interface ExistingOfferInput {
  id: string;
  shopId: string;
  externalId: string | null;
  url: string;
  affiliateUrl: string | null;
  title: string;
  imageUrl: string | null;
  packType: string;
  spoolCount: number;
  totalWeightG: number | null;
  etag: string | null;
  lastModifiedHeader: string | null;
  latestPriceCents: number | null;
  latestCurrency: string | null;
  latestInStock: boolean | null;
  sourceConfidence: number | null;
}

export interface ConditionalRequestHeaders {
  etag?: string | null;
  lastModifiedHeader?: string | null;
}

export type OfferConfirmationResult =
  | {
      status: "not-modified";
      etag: string | null;
      lastModifiedHeader: string | null;
    }
  | {
      status: "updated";
      candidate: ScrapedOfferCandidate;
      etag: string | null;
      lastModifiedHeader: string | null;
    }
  | {
      status: "unmatched";
      etag: string | null;
      lastModifiedHeader: string | null;
    };

export interface ScrapeFilamentInput {
  id: string;
  slug: string;
  brand: string;
  series: string | null;
  material: string;
  colorName: string | null;
  weightG: number;
  imageUrl: string | null;
  bambuCode: string | null;
  ean?: string | null;
}

export interface ShopScraper {
  shopId: string;
  buildSearchUrl?(query: string): string;
  extractOffers?(html: string, pageUrl: string): ScrapedOfferCandidate[];
  parseOfferPage?(html: string, offer: ExistingOfferInput): ScrapedOfferCandidate[];
  queryForFilament?(filament: ScrapeFilamentInput): string;
  supportsFilament?(filament: ScrapeFilamentInput): boolean;
  scoreFilament?(filament: ScrapeFilamentInput): number;
  scrapeFilament?(filament: ScrapeFilamentInput): Promise<ScrapedOfferCandidate[]>;
  confirmOffer?(offer: ExistingOfferInput): Promise<OfferConfirmationResult>;
  /** If true, the scraper does its own matching — skip isStrongMatch in the main loop */
  trustMatching?: boolean;
  /** If true, this shop carries multiple brands — offers must match the filament's brand */
  multiRetailer?: boolean;
}
