import { AmazonPaapiScraper, type AmazonPaapiConfig } from "./amazon-paapi.js";

export type ScraperType = "amazon-paapi" | "playwright" | "api";

const scraperRegistry = new Map<string, AmazonPaapiScraper>();

export function registerAmazonScraper(shopId: string, config: AmazonPaapiConfig) {
  scraperRegistry.set(shopId, new AmazonPaapiScraper(config));
}

export function getScraper(shopId: string): AmazonPaapiScraper | undefined {
  return scraperRegistry.get(shopId);
}

export function initScrapers() {
  const accessKey = process.env.AMAZON_ACCESS_KEY;
  const secretKey = process.env.AMAZON_SECRET_KEY;
  const partnerTag = process.env.AMAZON_PARTNER_TAG;
  const marketplace = process.env.AMAZON_MARKETPLACE ?? "www.amazon.de";

  if (accessKey && secretKey && partnerTag) {
    registerAmazonScraper("amazon-de", {
      accessKey,
      secretKey,
      partnerTag,
      market: marketplace,
    });
    console.log("✅ Amazon PA-API scraper registered for amazon-de");
  } else {
    console.warn("⚠️  Amazon PA-API credentials not configured, scraper disabled");
  }
}

export { AmazonPaapiScraper } from "./amazon-paapi.js";
