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
}

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
  queryForFilament?(filament: ScrapeFilamentInput): string;
  supportsFilament?(filament: ScrapeFilamentInput): boolean;
  scoreFilament?(filament: ScrapeFilamentInput): number;
  scrapeFilament?(filament: ScrapeFilamentInput): Promise<ScrapedOfferCandidate[]>;
  /** If true, the scraper does its own matching — skip isStrongMatch in the main loop */
  trustMatching?: boolean;
}
