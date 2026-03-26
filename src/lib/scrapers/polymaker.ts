/**
 * Polymaker Shop Scraper (Shopify JSON API)
 *
 * Uses Shopify's public /products.json endpoint — no Playwright needed.
 * Scrapes all collections, extracts variants with prices, images, SKUs.
 */

import { TRACKER_USER_AGENT } from "@/lib/env";
import type { ScrapedOfferCandidate, ScrapeFilamentInput, ShopScraper } from "@/lib/scrapers/types";
import { normalizeComparable, slugify } from "@/lib/utils";

const BASE_URL = "https://shop.polymaker.com";
const FILAMENT_TYPES = new Set(["Panchroma Filament", "Polymaker Filament", "Fiberon Filament"]);

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

let cachedProducts: ShopifyProduct[] | null = null;

async function fetchAllProducts(): Promise<ShopifyProduct[]> {
  if (cachedProducts) return cachedProducts;

  const products: ShopifyProduct[] = [];
  let page = 1;

  while (true) {
    const response = await fetch(`${BASE_URL}/products.json?limit=250&page=${page}`, {
      headers: { "user-agent": TRACKER_USER_AGENT },
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) break;
    const data = (await response.json()) as { products: ShopifyProduct[] };
    if (data.products.length === 0) break;

    products.push(...data.products.filter((p) => FILAMENT_TYPES.has(p.product_type)));
    if (data.products.length < 250) break;
    page++;
  }

  cachedProducts = products;
  return products;
}

function parseWeightFromTitle(title: string): number | null {
  const match = title.match(/(\d+(?:\.\d+)?)\s*(?:kg|g)/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  return title.toLowerCase().includes("kg") ? Math.round(value * 1000) : Math.round(value);
}

function variantToCandidate(
  product: ShopifyProduct,
  variant: ShopifyVariant,
): ScrapedOfferCandidate | null {
  const priceCents = Math.round(parseFloat(variant.price) * 100);
  if (!Number.isFinite(priceCents) || priceCents <= 0) return null;

  const variantTitle = [variant.option1, variant.option2, variant.option3]
    .filter(Boolean)
    .join(" / ");
  const fullTitle = variantTitle ? `${product.title} · ${variantTitle}` : product.title;

  const imageUrl =
    variant.featured_image?.src ||
    product.images[0]?.src ||
    null;

  const weightG = parseWeightFromTitle(variantTitle) || parseWeightFromTitle(product.title) || 1000;

  return {
    externalId: String(variant.id),
    title: fullTitle,
    url: `${BASE_URL}/products/${product.handle}?variant=${variant.id}`,
    affiliateUrl: `${BASE_URL}/products/${product.handle}?variant=${variant.id}`,
    imageUrl,
    priceCents,
    currency: "USD",
    inStock: variant.available,
    packType: "single",
    spoolCount: 1,
    totalWeightG: weightG,
    sourceConfidence: 0.85,
  };
}

function matchVariantToFilament(
  filament: ScrapeFilamentInput,
  product: ShopifyProduct,
  variant: ShopifyVariant,
): boolean {
  const variantParts = [variant.option1, variant.option2, variant.option3].filter(Boolean);
  const variantText = normalizeComparable(variantParts.join(" "));
  const productText = normalizeComparable(product.title);

  // Must be 1.75mm (skip 2.85mm variants)
  if (variantText.includes("2.85") || variantText.includes("285")) return false;

  // Check color match
  const colorTokens = normalizeComparable(filament.colorName)
    .split(" ")
    .filter((t) => t.length > 2);
  if (colorTokens.length > 0) {
    const fullText = `${productText} ${variantText}`;
    const matched = colorTokens.filter((t) => fullText.includes(t));
    if (matched.length < colorTokens.length) return false;
  }

  // Check material/series match
  const seriesTokens = normalizeComparable(filament.series)
    .split(" ")
    .filter((t) => t.length > 2);
  if (seriesTokens.length > 0) {
    const matched = seriesTokens.filter((t) => productText.includes(t));
    if (matched.length === 0) return false;
  }

  return true;
}

export const polymakerScraper: ShopScraper = {
  shopId: "polymaker-us",

  supportsFilament(filament: ScrapeFilamentInput) {
    return filament.brand.toLowerCase() === "polymaker";
  },

  scoreFilament(filament: ScrapeFilamentInput) {
    const weight = filament.weightG === 1000 ? 20 : 10;
    const material = ["PLA", "PETG", "ABS", "ASA", "TPU"].includes(filament.material.toUpperCase()) ? 12 : 4;
    return 100 + weight + material;
  },

  async scrapeFilament(filament: ScrapeFilamentInput): Promise<ScrapedOfferCandidate[]> {
    const products = await fetchAllProducts();
    const candidates: ScrapedOfferCandidate[] = [];

    for (const product of products) {
      for (const variant of product.variants) {
        if (matchVariantToFilament(filament, product, variant)) {
          const candidate = variantToCandidate(product, variant);
          if (candidate) candidates.push(candidate);
        }
      }
    }

    return candidates;
  },
};
