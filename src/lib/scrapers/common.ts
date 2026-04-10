import { load } from "cheerio";
import { parseNumberish, slugify, toPriceCents } from "@/lib/utils";
import type { ScrapedOfferCandidate } from "@/lib/scrapers/types";

type JsonLdNode = Record<string, unknown> & {
  "@type"?: string | string[];
  itemListElement?: unknown[];
  offers?: Record<string, unknown> | Array<Record<string, unknown>>;
  name?: string;
  url?: string;
  image?: string | string[];
  sku?: string;
  productID?: string;
  gtin13?: string;
  gtin12?: string;
  gtin?: string;
  gtin14?: string;
};

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

/** Normalize JSON-LD @type — strip schema.org URI prefix */
function normalizeType(type: string | undefined): string {
  if (!type) return "";
  return type.replace(/^https?:\/\/schema\.org\//, "");
}

/** Sanitize JSON-LD text: replace unescaped control characters that break JSON.parse */
function sanitizeJsonLd(raw: string): string {
  return raw.replace(/[\x00-\x1f]/g, (ch) => {
    if (ch === "\n" || ch === "\r" || ch === "\t") return " ";
    return "";
  });
}

function extractOffer(node: JsonLdNode, pageUrl: string): ScrapedOfferCandidate | null {
  const rawOffers = asArray(node.offers as Record<string, unknown> | Array<Record<string, unknown>> | undefined);
  const firstOffer = rawOffers[0] ?? {};
  const price = parseNumberish(String(firstOffer.price ?? ""));
  const title = node.name?.trim();
  const url = typeof node.url === "string" ? new URL(node.url, pageUrl).toString() : pageUrl;
  const imageValue = asArray(node.image as string | string[] | undefined)[0] ?? null;
  const itemCount = parseInt(String(firstOffer.inventoryLevel ?? "1"), 10);
  const inferredWeightMatch = title?.match(/(\d+)\s*(kg|g)/i);
  const inferredWeightG = inferredWeightMatch
    ? Math.round(Number(inferredWeightMatch[1]) * (inferredWeightMatch[2].toLowerCase() === "kg" ? 1000 : 1))
    : null;
  const spoolCountMatch = title?.match(/(\d+)\s*x/i);
  const spoolCount = spoolCountMatch ? Number(spoolCountMatch[1]) : 1;
  const externalId =
    String(node.sku ?? node.productID ?? slugify(`${title ?? "offer"}-${url}`)).slice(0, 100);
  const ean = (node.gtin13 || node.gtin12 || node.gtin || node.gtin14 || null) as string | null;

  if (!title) return null;

  return {
    externalId,
    title,
    url,
    affiliateUrl: url,
    imageUrl: imageValue ? new URL(imageValue, pageUrl).toString() : null,
    priceCents: toPriceCents(price),
    currency: String(firstOffer.priceCurrency ?? "EUR"),
    inStock: typeof firstOffer.availability === "string"
      ? !String(firstOffer.availability).includes("OutOfStock")
      : Number.isFinite(itemCount) ? itemCount > 0 : true,
    packType: spoolCount > 1 ? "bulk" : "single",
    spoolCount,
    totalWeightG: inferredWeightG ? inferredWeightG * spoolCount : inferredWeightG,
    sourceConfidence: 0.55,
    ean,
  };
}

export function extractJsonLdOffers(html: string, pageUrl: string) {
  const $ = load(html);
  const results: ScrapedOfferCandidate[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).text().trim();
    if (!raw) return;

    try {
      const sanitized = sanitizeJsonLd(raw);
      const parsed = JSON.parse(sanitized) as JsonLdNode | JsonLdNode[];
      const nodes = Array.isArray(parsed) ? parsed : [parsed];

      for (const node of nodes) {
        const types = asArray(node["@type"]).map(normalizeType);
        if (types.includes("ItemList")) {
          for (const item of asArray(node.itemListElement as JsonLdNode[] | undefined)) {
            const candidate = extractOffer(item, pageUrl);
            if (candidate) results.push(candidate);
          }
          continue;
        }

        if (types.includes("Product")) {
          const candidate = extractOffer(node, pageUrl);
          if (candidate) results.push(candidate);
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });

  return dedupeCandidates(results);
}

function dedupeCandidates(candidates: ScrapedOfferCandidate[]) {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = `${candidate.externalId}:${candidate.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function collapseWhitespace(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function inferPackDetails(title: string) {
  const normalizedTitle = collapseWhitespace(title);
  const spoolCountMatch = normalizedTitle.match(/(?:multipack\s*)?(\d+)\s*(?:x|pcs?|spools?)\b/i);
  const spoolCount = spoolCountMatch ? Number(spoolCountMatch[1]) : 1;
  const weightMatch = normalizedTitle.match(/(\d+(?:[.,]\d+)?)\s*(kg|g)\b/i);
  const weightValue = weightMatch ? Number(weightMatch[1].replace(",", ".")) : null;
  const unitWeightG = weightMatch
    ? Math.round(weightValue! * (weightMatch[2].toLowerCase() === "kg" ? 1000 : 1))
    : null;
  const totalWeightG = unitWeightG ? unitWeightG * spoolCount : null;

  return {
    spoolCount,
    totalWeightG,
    packType: spoolCount > 1 ? "bulk" : unitWeightG && unitWeightG < 100 ? "sampler" : "single",
  };
}

function detectStock(value: string | null | undefined) {
  const normalized = collapseWhitespace(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s]/g, "");
  if (!normalized) return true;
  if (
    normalized.includes("out of stock") ||
    normalized.includes("sold out") ||
    normalized.includes("ausverkauft") ||
    normalized.includes("nicht verfugbar") ||
    normalized.includes("not available")
  ) {
    return false;
  }

  return true;
}

export function buildCandidate(input: {
  externalId?: string | null;
  title: string;
  url: string;
  imageUrl?: string | null;
  priceText?: string | null;
  currency?: string | null;
  stockText?: string | null;
  sourceConfidence?: number;
  ean?: string | null;
}) {
  const title = collapseWhitespace(input.title);
  if (!title) return null;

  const { spoolCount, totalWeightG, packType } = inferPackDetails(title);
  const externalId =
    input.externalId?.trim() ||
    slugify(`${title}-${new URL(input.url).pathname}`.slice(0, 180)).slice(0, 100);
  const price = parseNumberish(input.priceText ?? null);

  return {
    externalId,
    title,
    url: input.url,
    affiliateUrl: input.url,
    imageUrl: input.imageUrl || null,
    priceCents: toPriceCents(price),
    currency: input.currency?.trim() || "EUR",
    inStock: detectStock(input.stockText),
    packType,
    spoolCount,
    totalWeightG,
    sourceConfidence: input.sourceConfidence ?? 0.6,
    ean: input.ean || null,
  } satisfies ScrapedOfferCandidate;
}

export function rankCandidates<T extends ScrapedOfferCandidate>(query: string, candidates: T[]) {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  return [...candidates]
    .map((candidate) => {
      const title = candidate.title.toLowerCase();
      let score = candidate.sourceConfidence;
      for (const token of tokens) {
        if (title.includes(token)) score += 1;
      }
      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.candidate);
}
