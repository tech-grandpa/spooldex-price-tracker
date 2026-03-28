/**
 * Generic Shopify JSON API scraper.
 *
 * Works for any Shopify store that exposes /products.json.
 * No Playwright needed — pure fetch.
 */

import { TRACKER_USER_AGENT } from "@/lib/env";
import type { ScrapedOfferCandidate, ScrapeFilamentInput, ShopScraper } from "@/lib/scrapers/types";
import { normalizeComparable } from "@/lib/utils";

interface ShopifyVariant {
  id: number;
  title: string;
  sku: string;
  price: string;
  available: boolean;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  featured_image: { src: string } | null;
}

interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  product_type: string;
  vendor: string;
  variants: ShopifyVariant[];
  images: Array<{ src: string }>;
}

interface ShopifyShopConfig {
  shopId: string;
  baseUrl: string;
  currency: string;
  brandName: string;
  /** Filter which product types are filaments */
  isFilamentProduct: (product: ShopifyProduct) => boolean;
  /** Optional: custom variant-to-filament matching */
  matchVariant?: (filament: ScrapeFilamentInput, product: ShopifyProduct, variant: ShopifyVariant) => boolean;
  supportsFilament?: (filament: ScrapeFilamentInput) => boolean;
  scoreFilament?: (filament: ScrapeFilamentInput) => number;
}

const productCaches = new Map<string, ShopifyProduct[]>();

async function fetchAllProducts(baseUrl: string, isFilament: (p: ShopifyProduct) => boolean): Promise<ShopifyProduct[]> {
  if (productCaches.has(baseUrl)) return productCaches.get(baseUrl)!;

  const products: ShopifyProduct[] = [];
  let page = 1;

  while (true) {
    const response = await fetch(`${baseUrl}/products.json?limit=250&page=${page}`, {
      headers: { "user-agent": TRACKER_USER_AGENT },
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) break;
    const data = (await response.json()) as { products: ShopifyProduct[] };
    if (data.products.length === 0) break;
    products.push(...data.products.filter(isFilament));
    if (data.products.length < 250) break;
    page++;
  }

  productCaches.set(baseUrl, products);
  return products;
}

function parseWeightFromText(text: string): number | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:kg|g)/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  return text.toLowerCase().includes("kg") ? Math.round(value * 1000) : Math.round(value);
}

/** Noise words to strip from color/series tokens before matching */
const NOISE_TOKENS = new Set([
  "formerly", "previously", "original", "new", "old", "edition",
  "panchromaTM", "polyterraTM", "polyliteTM", "polymakerTM",
]);

function getDistinctiveTokens(text: string, exclude: Set<string> = new Set()): string[] {
  return normalizeComparable(text)
    .split(" ")
    .filter((t) => t.length > 2 && !NOISE_TOKENS.has(t) && !exclude.has(t))
    // Strip trademark suffixes
    .map((t) => t.replace(/TM$/i, ""));
}

function defaultMatchVariant(
  filament: ScrapeFilamentInput,
  product: ShopifyProduct,
  variant: ShopifyVariant,
): boolean {
  const variantParts = [variant.option1, variant.option2, variant.option3].filter(Boolean);
  const variantText = normalizeComparable(variantParts.join(" "));
  const productText = normalizeComparable(product.title);
  const fullText = `${productText} ${variantText}`;

  // Skip 2.85mm
  if (variantText.includes("2.85") || variantText.includes("285")) return false;

  // Series match — at least one distinctive series token must appear in product title
  const seriesTokens = getDistinctiveTokens(filament.series ?? "");
  if (seriesTokens.length > 0) {
    const matched = seriesTokens.filter((t) => fullText.includes(t));
    if (matched.length === 0) return false;
  }

  // Color match — extract ONLY the distinctive color tokens (strip series prefix + noise)
  const seriesTokenSet = new Set(seriesTokens);
  const colorTokens = getDistinctiveTokens(filament.colorName ?? "", seriesTokenSet);
  if (colorTokens.length > 0) {
    const matched = colorTokens.filter((t) => fullText.includes(t));
    if (matched.length < colorTokens.length) return false;
  }

  return true;
}

export function createShopifyScraper(config: ShopifyShopConfig): ShopScraper {
  return {
    shopId: config.shopId,
    trustMatching: true,

    supportsFilament: config.supportsFilament ?? ((filament) =>
      filament.brand.toLowerCase() === config.brandName.toLowerCase()
    ),

    scoreFilament: config.scoreFilament ?? ((filament) => {
      const weight = filament.weightG === 1000 ? 20 : 10;
      const material = ["PLA", "PETG", "ABS", "ASA", "TPU"].includes(filament.material.toUpperCase()) ? 12 : 4;
      return 100 + weight + material;
    }),

    async scrapeFilament(filament: ScrapeFilamentInput): Promise<ScrapedOfferCandidate[]> {
      const products = await fetchAllProducts(config.baseUrl, config.isFilamentProduct);
      const matchFn = config.matchVariant ?? defaultMatchVariant;
      const candidates: ScrapedOfferCandidate[] = [];

      for (const product of products) {
        for (const variant of product.variants) {
          if (!matchFn(filament, product, variant)) continue;

          const priceCents = Math.round(parseFloat(variant.price) * 100);
          if (!Number.isFinite(priceCents) || priceCents <= 0) continue;

          const variantTitle = [variant.option1, variant.option2, variant.option3]
            .filter(Boolean)
            .join(" / ");
          const fullTitle = variantTitle ? `${product.title} · ${variantTitle}` : product.title;
          const imageUrl = variant.featured_image?.src || product.images[0]?.src || null;
          const weightG = parseWeightFromText(variantTitle) || parseWeightFromText(product.title) || 1000;

          candidates.push({
            externalId: String(variant.id),
            title: fullTitle,
            url: `${config.baseUrl}/products/${product.handle}?variant=${variant.id}`,
            affiliateUrl: `${config.baseUrl}/products/${product.handle}?variant=${variant.id}`,
            imageUrl,
            priceCents,
            currency: config.currency,
            inStock: variant.available,
            packType: "single",
            spoolCount: 1,
            totalWeightG: weightG,
            sourceConfidence: 0.85,
          });
        }
      }

      return candidates;
    },
  };
}
