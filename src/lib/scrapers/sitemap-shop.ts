import { load } from "cheerio";
import { TRACKER_USER_AGENT } from "@/lib/env";
import { waitForPoliteTurn } from "@/lib/robots";
import { buildCandidate, collapseWhitespace, extractJsonLdOffers } from "@/lib/scrapers/common";
import type { ScrapedOfferCandidate, ScrapeFilamentInput, ShopScraper } from "@/lib/scrapers/types";
import { normalizeComparable, slugify } from "@/lib/utils";

interface SitemapShopConfig {
  shopId: string;
  sitemapUrls: string[];
  parseProductPage: (html: string, pageUrl: string) => ScrapedOfferCandidate[];
  supportsFilament?: (filament: ScrapeFilamentInput) => boolean;
  scoreFilament?: (filament: ScrapeFilamentInput) => number;
  queryForFilament?: (filament: ScrapeFilamentInput) => string;
  productUrlFilter?: (url: string) => boolean;
  maxCandidateUrls?: number;
}

const sitemapCache = new Map<string, Promise<string[]>>();
const pageCache = new Map<string, Promise<string | null>>();

function normalizeTokens(value: string | null | undefined) {
  return normalizeComparable(value)
    .split(" ")
    .filter((token) => token.length > 1 && token !== "filament" && token !== "spool");
}

function parseWeightToken(token: string) {
  const match = token.match(/^(\d+(?:[.,]\d+)?)(kg|g)$/);
  if (!match) return null;
  const amount = Number(match[1].replace(",", "."));
  if (!Number.isFinite(amount)) return null;
  return Math.round(amount * (match[2] === "kg" ? 1000 : 1));
}

function getWeightTokens(filament: ScrapeFilamentInput) {
  if (!filament.weightG) return [];
  if (filament.weightG % 1000 === 0) {
    return [`${filament.weightG / 1000}kg`, `${filament.weightG}g`];
  }
  return [`${filament.weightG}g`];
}

async function fetchText(url: string) {
  const politeTurn = await waitForPoliteTurn(url);
  if (!politeTurn.allowed) {
    console.warn(`[robots] skipping ${url}`);
    return null;
  }

  const response = await fetch(url, {
    headers: {
      "user-agent": TRACKER_USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(`fetch failed ${response.status} for ${url}`);
  }

  return response.text();
}

async function getSitemapUrls(url: string) {
  if (!sitemapCache.has(url)) {
    sitemapCache.set(
      url,
      (async () => {
        const xml = await fetchText(url);
        if (!xml) return [];

        return Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g))
          .map((match) => match[1]?.trim())
          .filter((entry): entry is string => Boolean(entry))
          .filter((entry, index, list) => list.indexOf(entry) === index);
      })(),
    );
  }

  return sitemapCache.get(url)!;
}

async function getProductPage(url: string) {
  if (!pageCache.has(url)) {
    pageCache.set(url, fetchText(url));
  }

  return pageCache.get(url)!;
}

function scoreProductUrl(url: string, filament: ScrapeFilamentInput) {
  const normalized = normalizeComparable(new URL(url).pathname.replaceAll("-", " "));
  const brandTokens = normalizeTokens(filament.brand);
  const seriesTokens = normalizeTokens(filament.series);
  const materialTokens = normalizeTokens(filament.material);
  const colorTokens = normalizeTokens(filament.colorName);
  const weightTokens = getWeightTokens(filament);

  let score = 0;

  for (const token of brandTokens) {
    if (normalized.includes(token)) score += 5;
  }
  for (const token of seriesTokens) {
    if (normalized.includes(token)) score += 4;
  }
  for (const token of materialTokens) {
    if (normalized.includes(token)) score += 3;
  }
  for (const token of colorTokens) {
    if (normalized.includes(token)) score += 2;
  }
  for (const token of weightTokens) {
    const weight = parseWeightToken(token);
    if (!weight) continue;
    if (normalized.includes(token)) score += 3;
    if (weight === 1000 && normalized.includes("1 kg")) score += 3;
  }

  if (normalized.includes("filament")) score += 1;
  return score;
}

function defaultQueryForFilament(filament: ScrapeFilamentInput) {
  return [filament.brand, filament.series, filament.material, filament.colorName].filter(Boolean).join(" ");
}

async function getCandidateProductUrls(config: SitemapShopConfig, filament: ScrapeFilamentInput) {
  const sitemapEntries = await Promise.all(config.sitemapUrls.map((url) => getSitemapUrls(url)));
  const urls = sitemapEntries
    .flat()
    .filter((entry) => config.productUrlFilter ? config.productUrlFilter(entry) : true)
    .map((url) => ({ url, score: scoreProductUrl(url, filament) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, config.maxCandidateUrls ?? 5)
    .map((entry) => entry.url);

  return urls.filter((entry, index, list) => list.indexOf(entry) === index);
}

function sanitizeVariantLabel(value: string) {
  return collapseWhitespace(value.replace(/#(?:[a-f0-9]{3,8})/gi, "").replace(/\s+/g, " "));
}

function extractAttributeOptions(
  $: ReturnType<typeof load>,
  matcher: (attributeName: string) => boolean,
) {
  return $("input.js_variant_change")
    .map((_, element) => {
      const input = $(element);
      const attributeName = collapseWhitespace(
        input.attr("data-attribute_name") || input.attr("data-attribute-name") || "",
      );
      if (!matcher(attributeName.toLowerCase())) return null;

      const valueName = sanitizeVariantLabel(
        input.attr("data-value_name") || input.attr("data-value-name") || input.attr("title") || "",
      );
      if (!valueName) return null;

      return {
        valueName,
        checked: input.is(":checked") || input.attr("checked") != null,
      };
    })
    .get()
    .filter((entry): entry is { valueName: string; checked: boolean } => Boolean(entry));
}

export function extractOdooVariantOffers(html: string, pageUrl: string) {
  const $ = load(html);
  const title = collapseWhitespace(
    $('meta[property="og:title"]').attr("content") ||
      $("h1[itemprop='name']").first().text() ||
      $("h1").first().text(),
  );
  const priceText =
    $("[itemprop='price']").attr("content") ||
    $(".oe_price .oe_currency_value").first().text() ||
    $(".oe_currency_value").first().text() ||
    null;
  const currency =
    $("[itemprop='priceCurrency']").attr("content") ||
    $("[itemprop='priceCurrency']").first().text() ||
    "EUR";
  const availability =
    $("[itemprop='availability']").attr("href") ||
    $("[itemprop='availability']").attr("content") ||
    $(".availability_messages").text() ||
    null;
  const imageUrl =
    $('meta[property="og:image"]').attr("content") ||
    $("img[itemprop='image']").attr("src") ||
    null;
  const productId = $("input.product_id").attr("value") || slugify(new URL(pageUrl).pathname);
  const colorOptions = extractAttributeOptions($, (attributeName) =>
    attributeName.includes("color") || attributeName.includes("farbe"),
  );
  const weightOptions = extractAttributeOptions($, (attributeName) =>
    attributeName.includes("weight") || attributeName.includes("gewicht"),
  );

  const selectedWeight = weightOptions.find((entry) => entry.checked) || weightOptions[0] || null;
  const colors = colorOptions.slice(0, 20);
  const variants = colors.length > 0 ? colors : [{ valueName: "", checked: true }];

  return variants
    .map((color, index) => {
      const detailParts = [color.valueName, selectedWeight?.valueName].filter(Boolean);
      const fullTitle = detailParts.length > 0 ? `${title} · ${detailParts.join(" · ")}` : title;
      return buildCandidate({
        externalId: `${productId}-${index}-${slugify(detailParts.join("-") || "default")}`.slice(0, 100),
        title: fullTitle,
        url: pageUrl,
        imageUrl: imageUrl ? new URL(imageUrl, pageUrl).toString() : null,
        priceText,
        currency,
        stockText: availability,
        sourceConfidence: 0.72,
      });
    })
    .filter((entry): entry is ScrapedOfferCandidate => Boolean(entry));
}

export function createSitemapProductScraper(config: SitemapShopConfig): ShopScraper {
  return {
    shopId: config.shopId,
    trustMatching: true,
    supportsFilament: config.supportsFilament,
    scoreFilament: config.scoreFilament,
    queryForFilament: config.queryForFilament || defaultQueryForFilament,
    async scrapeFilament(filament) {
      const productUrls = await getCandidateProductUrls(config, filament);
      const candidates: ScrapedOfferCandidate[] = [];

      for (const productUrl of productUrls) {
        const html = await getProductPage(productUrl);
        if (!html) continue;
        candidates.push(...config.parseProductPage(html, productUrl));
      }

      return candidates.filter((entry, index, list) =>
        list.findIndex((candidate) => candidate.externalId === entry.externalId) === index
      );
    },
  };
}

export function createJsonLdProductParser(sourceConfidence = 0.68) {
  return (html: string, pageUrl: string) =>
    extractJsonLdOffers(html, pageUrl).map((entry) => ({
      ...entry,
      sourceConfidence: Math.max(entry.sourceConfidence, sourceConfidence),
    }));
}
