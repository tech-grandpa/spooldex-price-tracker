/**
 * Extrudr Shop Scraper
 *
 * Austrian filament manufacturer. Custom scraper because:
 * - Product names are in German on the /de/at/ pages
 * - Catalog has English color names
 * - We match by URL path tokens + SKU patterns instead of title text
 *
 * Uses the sitemap to discover product URLs, then fetches JSON-LD.
 */

import { TRACKER_USER_AGENT } from "@/lib/env";
import { extractJsonLdOffers } from "@/lib/scrapers/common";
import type { ScrapedOfferCandidate, ScrapeFilamentInput, ShopScraper } from "@/lib/scrapers/types";
import { normalizeComparable } from "@/lib/utils";

const SITEMAP_URL = "https://extrudr.com/sitemap-0.xml";
const PRODUCT_BASE = "https://www.extrudr.com/de/at/products";

let cachedProductUrls: string[] | null = null;

async function getProductUrls(): Promise<string[]> {
  if (cachedProductUrls) return cachedProductUrls;

  const response = await fetch(SITEMAP_URL, {
    headers: { "user-agent": TRACKER_USER_AGENT },
    signal: AbortSignal.timeout(30000),
  });
  const xml = await response.text();
  const urls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
    .map((m) => m[1]?.trim())
    .filter((u): u is string => Boolean(u) && u.includes("/products/"))
    .filter((u) => !u.includes("/brozzl"));

  cachedProductUrls = urls;
  return urls;
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "user-agent": TRACKER_USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;
    return response.text();
  } catch {
    return null;
  }
}

/** Score how well a URL path matches a filament */
function scoreUrlMatch(url: string, filament: ScrapeFilamentInput): number {
  const path = normalizeComparable(new URL(url).pathname.replaceAll("-", " ").replaceAll("/", " "));

  // Extract distinctive tokens from filament series and color
  const seriesTokens = normalizeComparable(filament.series ?? "")
    .split(" ")
    .filter((t) => t.length > 2 && t !== "extrudr");
  const colorTokens = normalizeComparable(filament.colorName ?? "")
    .split(" ")
    .filter((t) => t.length > 2 && t !== "extrudr" && !seriesTokens.includes(t));

  let score = 0;
  for (const token of seriesTokens) {
    if (path.includes(token)) score += 5;
  }
  for (const token of colorTokens) {
    if (path.includes(token)) score += 3;
  }

  return score;
}

export const extrudrScraper: ShopScraper = {
  shopId: "extrudr-eu",

  supportsFilament(filament: ScrapeFilamentInput) {
    return filament.brand.toLowerCase() === "extrudr";
  },

  scoreFilament(filament: ScrapeFilamentInput) {
    const weight = filament.weightG >= 750 && filament.weightG <= 1100 ? 20 : 10;
    return 100 + weight;
  },

  async scrapeFilament(filament: ScrapeFilamentInput): Promise<ScrapedOfferCandidate[]> {
    const urls = await getProductUrls();

    // Score and rank URLs by path match
    const scored = urls
      .map((url) => ({ url, score: scoreUrlMatch(url, filament) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const candidates: ScrapedOfferCandidate[] = [];
    for (const { url } of scored) {
      const html = await fetchPage(url);
      if (!html) continue;
      const offers = extractJsonLdOffers(html, url);
      candidates.push(...offers.map((o) => ({ ...o, sourceConfidence: 0.80 })));
    }

    return candidates;
  },
};
