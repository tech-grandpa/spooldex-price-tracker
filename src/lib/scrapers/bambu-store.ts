import { load } from "cheerio";
import { TRACKER_USER_AGENT } from "@/lib/env";
import { waitForPoliteTurn } from "@/lib/robots";
import { buildCandidate } from "@/lib/scrapers/common";
import type { ScrapedOfferCandidate, ScrapeFilamentInput, ShopScraper } from "@/lib/scrapers/types";
import { normalizeComparable } from "@/lib/utils";

interface BambuJsonLdVariant {
  sku?: string;
  name?: string;
  image?: string | string[];
  offers?: {
    url?: string;
    price?: number | string;
    priceCurrency?: string;
    availability?: string;
  };
}

interface BambuJsonLdProductGroup {
  "@type"?: string;
  url?: string;
  hasVariant?: BambuJsonLdVariant[];
}

interface ParsedBambuVariant {
  productCode: string | null;
  candidate: ScrapedOfferCandidate;
}

interface BambuTierOffer {
  minimumSpools: number;
  pricePerSpoolCents: number;
  currency: string;
}

const PRODUCT_SITEMAP_URL = "https://eu.store.bambulab.com/sitemap_products_1.xml";
const productSitemapCache: { urls?: Promise<string[]> } = {};
const productVariantCache = new Map<string, Promise<ParsedBambuVariant[]>>();
const productHtmlCache = new Map<string, Promise<string | null>>();

function normalizeTokens(value: string | null | undefined) {
  return normalizeComparable(value)
    .split(" ")
    .filter((token) => token.length > 1 && token !== "filament" && token !== "standard");
}

async function fetchText(url: string) {
  const turn = await waitForPoliteTurn(url);
  if (!turn.allowed) {
    console.warn(`[robots] skipping bambu fetch ${url}`);
    return null;
  }

  const response = await fetch(url, {
    headers: {
      "user-agent": TRACKER_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`Bambu fetch failed ${response.status} for ${url}`);
  }

  return response.text();
}

async function getProductSitemapUrls() {
  if (!productSitemapCache.urls) {
    productSitemapCache.urls = (async () => {
      const xml = await fetchText(PRODUCT_SITEMAP_URL);
      if (!xml) return [];

      return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
        .map((match) => match[1]?.trim())
        .filter((entry): entry is string => Boolean(entry))
        .filter((entry) => {
          const pathname = new URL(entry).pathname;
          return pathname.startsWith("/products/");
        })
        .filter((entry, index, list) => list.indexOf(entry) === index);
    })();
  }

  return productSitemapCache.urls;
}

function asArray<T>(value: T | T[] | null | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function parseVariantProductCode(name: string | null | undefined) {
  return name?.match(/\(([\dA-Z-]+)\)/)?.[1] ?? null;
}

function scoreProductUrl(url: string, filament: ScrapeFilamentInput) {
  const slug = new URL(url).pathname.split("/").pop() || "";
  const slugTokens = slug.split("-").filter(Boolean);
  const compareTokens = new Set([
    ...normalizeTokens(filament.series),
    ...normalizeTokens(filament.material),
  ]);

  let score = 0;
  for (const token of compareTokens) {
    if (slugTokens.includes(token)) score += 3;
    else if (slug.includes(token)) score += 1;
  }

  const materialSlug = normalizeTokens(filament.material).join("-");
  if (materialSlug && slug.includes(materialSlug)) score += 4;

  return score;
}

async function getCandidateProductUrls(filament: ScrapeFilamentInput) {
  const urls = await getProductSitemapUrls();
  return urls
    .map((url) => ({ url, score: scoreProductUrl(url, filament) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((entry) => entry.url);
}

export function parseBambuProductPageVariants(html: string, pageUrl: string) {
  const $ = load(html);
  const variants: ParsedBambuVariant[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).text().trim();
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as BambuJsonLdProductGroup | BambuJsonLdProductGroup[];
      const groups = Array.isArray(parsed) ? parsed : [parsed];
      for (const group of groups) {
        if (group["@type"] !== "ProductGroup") continue;

        for (const variant of group.hasVariant ?? []) {
          const url = variant.offers?.url || group.url || pageUrl;
          const imageUrl = asArray(variant.image)[0] ?? null;
          const candidate = buildCandidate({
            externalId: variant.sku || new URL(url, pageUrl).searchParams.get("id"),
            title: variant.name || "",
            url: new URL(url, pageUrl).toString(),
            imageUrl: imageUrl ? new URL(imageUrl, pageUrl).toString() : null,
            priceText: variant.offers?.price != null ? String(variant.offers.price) : null,
            currency: variant.offers?.priceCurrency || "EUR",
            stockText: variant.offers?.availability || null,
            sourceConfidence: 0.96,
          });

          if (!candidate) continue;
          variants.push({
            productCode: parseVariantProductCode(variant.name),
            candidate,
          });
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });

  return variants;
}

export function parseBambuTierOffer(html: string) {
  const match = html.match(/€\s*([0-9]+(?:[.,][0-9]{2})?)\s*EUR[\s\S]{0,200}?Lowest price for (\d+)\+ rolls/i);
  if (!match) return null;

  const pricePerSpool = Number(match[1].replace(",", "."));
  const minimumSpools = Number(match[2]);
  if (!Number.isFinite(pricePerSpool) || !Number.isFinite(minimumSpools)) return null;

  return {
    minimumSpools,
    pricePerSpoolCents: Math.round(pricePerSpool * 100),
    currency: "EUR",
  } satisfies BambuTierOffer;
}

async function getProductVariants(url: string) {
  if (!productVariantCache.has(url)) {
    productVariantCache.set(
      url,
      (async () => {
        const html = await getProductHtml(url);
        if (!html) return [];
        return parseBambuProductPageVariants(html, url);
      })(),
    );
  }

  return productVariantCache.get(url)!;
}

async function getProductHtml(url: string) {
  if (!productHtmlCache.has(url)) {
    productHtmlCache.set(url, fetchText(url));
  }

  return productHtmlCache.get(url)!;
}

async function getProductTierOffer(url: string) {
  const html = await getProductHtml(url);
  if (!html) return null;
  return parseBambuTierOffer(html);
}

function scoreVariant(filament: ScrapeFilamentInput, variant: ParsedBambuVariant) {
  let score = 0;
  const title = normalizeComparable(variant.candidate.title);
  if (filament.bambuCode && variant.productCode === filament.bambuCode) score += 100;

  for (const token of normalizeTokens(filament.material)) {
    if (title.includes(token)) score += 3;
  }
  for (const token of normalizeTokens(filament.colorName)) {
    if (title.includes(token)) score += 2;
  }
  for (const token of normalizeTokens(filament.series)) {
    if (title.includes(token)) score += 2;
  }

  return score;
}

export const bambuStoreScraper: ShopScraper = {
  shopId: "bambu-store-eu",
  supportsFilament(filament) {
    return filament.brand === "Bambu Lab" && Boolean(filament.bambuCode);
  },
  scoreFilament(filament) {
    const material = filament.material.toUpperCase();
    const materialScore = ["PLA", "PETG", "ABS", "ASA", "TPU"].includes(material) ? 25 : 10;
    const weightScore = filament.weightG === 1000 ? 10 : 0;
    return filament.bambuCode ? 100 + materialScore + weightScore : 0;
  },
  async scrapeFilament(filament) {
    const productUrls = await getCandidateProductUrls(filament);
    for (const productUrl of productUrls) {
      const variants = await getProductVariants(productUrl);
      const ranked = variants
        .map((variant) => ({
          variant,
          score: scoreVariant(filament, variant),
        }))
        .filter((entry) => entry.score >= (filament.bambuCode ? 100 : 4))
        .sort((a, b) => b.score - a.score);

      if (ranked[0]) {
        const bestCandidate = ranked[0].variant.candidate;
        const tierOffer = await getProductTierOffer(productUrl);
        const syntheticOffers: ScrapedOfferCandidate[] = [bestCandidate];

        if (
          tierOffer &&
          tierOffer.minimumSpools > 1 &&
          bestCandidate.priceCents != null &&
          tierOffer.pricePerSpoolCents < bestCandidate.priceCents
        ) {
          syntheticOffers.push({
            ...bestCandidate,
            externalId: `${bestCandidate.externalId}-mix-${tierOffer.minimumSpools}`,
            title: `${bestCandidate.title} · ${tierOffer.minimumSpools}+ mix & match tier`,
            packType: "bulk",
            spoolCount: tierOffer.minimumSpools,
            totalWeightG: filament.weightG * tierOffer.minimumSpools,
            priceCents: tierOffer.pricePerSpoolCents * tierOffer.minimumSpools,
            currency: tierOffer.currency,
            sourceConfidence: 0.9,
          });
        }

        return syntheticOffers;
      }
    }

    return [];
  },
};
