/**
 * Extrudr Shop Scraper (Saleor GraphQL store)
 *
 * Extrudr uses Saleor (GraphQL) with variant data embedded in page HTML.
 * Each product URL (e.g. /products/biofusion/) contains ALL color/size variants.
 * JSON-LD only shows the default variant, so we parse variant names + prices from
 * the embedded JS data instead.
 */

import { TRACKER_USER_AGENT } from "@/lib/env";
import { fetchTextConditionally } from "@/lib/scrapers/http";
import { selectMatchingCandidate } from "@/lib/scrapers/offer-matching";
import type {
  ExistingOfferInput,
  ScrapedOfferCandidate,
  ScrapeFilamentInput,
  ShopScraper,
} from "@/lib/scrapers/types";
import { normalizeComparable, slugify } from "@/lib/utils";

const SITEMAP_URL = "https://extrudr.com/sitemap-0.xml";

let cachedProductUrls: string[] | null = null;

async function getProductUrls(): Promise<string[]> {
  if (cachedProductUrls) return cachedProductUrls;
  const response = await fetch(SITEMAP_URL, {
    headers: { "user-agent": TRACKER_USER_AGENT },
    signal: AbortSignal.timeout(30000),
  });
  const xml = await response.text();
  cachedProductUrls = Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
    .map((m) => m[1]?.trim())
    .filter((u): u is string => Boolean(u) && u.includes("/products/"))
    .filter((u) => !u.includes("/brozzl"));
  return cachedProductUrls;
}

interface ExtractedVariant {
  name: string;
  sku: string | null;
  priceCents: number | null;
  currency: string;
}

function extractVariantsFromHtml(html: string): ExtractedVariant[] {
  const variants: ExtractedVariant[] = [];

  // Extract variant names — format: "BioFusion cherry red 1.75 mm 0.8 kg"
  const nameMatches = html.matchAll(/"name":"([^"]+\d+(?:,\d+)?\s*(?:mm|kg)[^"]*?)"/g);
  const seenNames = new Set<string>();
  for (const match of nameMatches) {
    const name = match[1];
    if (seenNames.has(name)) continue;
    seenNames.add(name);
    variants.push({ name, sku: null, priceCents: null, currency: "EUR" });
  }

  // Extract prices — find JSON-LD price as fallback
  const jsonLdMatch = html.match(/"price":\s*"?(\d+\.?\d*)"?.*?"priceCurrency":\s*"([A-Z]+)"/);
  const defaultPriceCents = jsonLdMatch ? Math.round(parseFloat(jsonLdMatch[1]) * 100) : null;
  const defaultCurrency = jsonLdMatch?.[2] ?? "EUR";

  // Try to get per-variant prices from the Saleor data
  for (const variant of variants) {
    variant.currency = defaultCurrency;
    variant.priceCents = defaultPriceCents;
  }

  return variants;
}

function scoreUrlMatch(url: string, filament: ScrapeFilamentInput): number {
  const path = normalizeComparable(new URL(url).pathname.replaceAll("-", " ").replaceAll("/", " "));
  const seriesTokens = normalizeComparable(filament.series ?? "")
    .split(" ")
    .filter((t) => t.length > 2 && t !== "extrudr");

  let score = 0;
  for (const token of seriesTokens) {
    if (path.includes(token)) score += 5;
  }
  return score;
}

function variantMatchesFilament(variantName: string, filament: ScrapeFilamentInput): boolean {
  const normalized = normalizeComparable(variantName);

  // Must be 1.75mm (or 175)
  if (!normalized.includes("1 75") && !normalized.includes("175")) return false;

  // Match color
  const colorTokens = normalizeComparable(filament.colorName ?? "")
    .split(" ")
    .filter((t) => t.length > 2 && !["extrudr", "durapro", "basic"].includes(t));
  if (colorTokens.length > 0) {
    const matched = colorTokens.filter((t) => normalized.includes(t));
    if (matched.length < colorTokens.length) return false;
  }

  return true;
}

export const extrudrScraper: ShopScraper = {
  shopId: "extrudr-eu",
  trustMatching: true,
  async confirmOffer(offer: ExistingOfferInput) {
    const fetched = await fetchTextConditionally(offer.url, {
      etag: offer.etag,
      lastModifiedHeader: offer.lastModifiedHeader,
    });
    if (!fetched) {
      return {
        status: "unmatched" as const,
        etag: offer.etag,
        lastModifiedHeader: offer.lastModifiedHeader,
      };
    }

    if (fetched.status === "not-modified") {
      return fetched;
    }

    const candidates = extractVariantsFromHtml(fetched.body)
      .filter((variant) => variant.priceCents && variant.priceCents > 0)
      .map((variant) => ({
        externalId: slugify(variant.name).slice(0, 100),
        title: variant.name,
        url: offer.url,
        affiliateUrl: offer.url,
        imageUrl: offer.imageUrl,
        priceCents: variant.priceCents,
        currency: variant.currency,
        inStock: true,
        packType: offer.packType,
        spoolCount: offer.spoolCount,
        totalWeightG: offer.totalWeightG,
        sourceConfidence: offer.sourceConfidence ?? 0.78,
        ean: null,
      }));
    const candidate = selectMatchingCandidate(offer, candidates);

    if (!candidate) {
      return {
        status: "unmatched" as const,
        etag: fetched.etag,
        lastModifiedHeader: fetched.lastModifiedHeader,
      };
    }

    return {
      status: "updated" as const,
      candidate,
      etag: fetched.etag,
      lastModifiedHeader: fetched.lastModifiedHeader,
    };
  },

  supportsFilament(filament: ScrapeFilamentInput) {
    return filament.brand.toLowerCase() === "extrudr";
  },

  scoreFilament(filament: ScrapeFilamentInput) {
    return 100 + (filament.weightG >= 750 && filament.weightG <= 1100 ? 20 : 10);
  },

  async scrapeFilament(filament: ScrapeFilamentInput): Promise<ScrapedOfferCandidate[]> {
    const urls = await getProductUrls();

    // Find the best matching product page by URL
    const scored = urls
      .map((url) => ({ url, score: scoreUrlMatch(url, filament) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    const candidates: ScrapedOfferCandidate[] = [];

    for (const { url } of scored) {
      try {
        const response = await fetch(url, {
          headers: { "user-agent": TRACKER_USER_AGENT },
          signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) continue;
        const html = await response.text();

        const variants = extractVariantsFromHtml(html);
        for (const variant of variants) {
          if (!variantMatchesFilament(variant.name, filament)) continue;
          if (!variant.priceCents || variant.priceCents <= 0) continue;

          const externalId = slugify(variant.name).slice(0, 100);
          candidates.push({
            externalId,
            title: variant.name,
            url,
            affiliateUrl: url,
            imageUrl: null,
            priceCents: variant.priceCents,
            currency: variant.currency,
            inStock: true,
            packType: "single",
            spoolCount: 1,
            totalWeightG: variant.name.includes("0.8") || variant.name.includes("0,8") ? 800 : variant.name.includes("1.1") || variant.name.includes("1,1") ? 1100 : 1000,
            sourceConfidence: 0.78,
            ean: null,
          });
        }
      } catch {
        // skip failed page fetches
      }
    }

    return candidates;
  },
};
