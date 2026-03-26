/**
 * Extrudr Shop Scraper (Sitemap + JSON-LD)
 *
 * Austrian filament manufacturer. Each product page is a specific
 * color/weight variant with JSON-LD structured data and EUR prices.
 */

import { createSitemapProductScraper, createJsonLdProductParser } from "@/lib/scrapers/sitemap-shop";
import type { ScrapeFilamentInput } from "@/lib/scrapers/types";

export const extrudrScraper = createSitemapProductScraper({
  shopId: "extrudr-eu",
  sitemapUrls: ["https://extrudr.com/sitemap-0.xml"],
  productUrlFilter(url) {
    const pathname = new URL(url).pathname.toLowerCase();
    return pathname.includes("/products/") && !pathname.includes("/brozzl");
  },
  supportsFilament(filament: ScrapeFilamentInput) {
    return filament.brand.toLowerCase() === "extrudr";
  },
  scoreFilament(filament: ScrapeFilamentInput) {
    const weight = filament.weightG >= 750 && filament.weightG <= 1100 ? 20 : 10;
    return 100 + weight;
  },
  parseProductPage: createJsonLdProductParser(0.80),
  maxCandidateUrls: 8,
});
