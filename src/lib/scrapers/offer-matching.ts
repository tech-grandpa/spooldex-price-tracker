import type { ExistingOfferInput, ScrapedOfferCandidate } from "@/lib/scrapers/types";
import { normalizeComparable } from "@/lib/utils";

const IMPORTANT_QUERY_PARAMS = ["id", "variant", "sku"];

function canonicalizeUrl(url: string) {
  const parsed = new URL(url);
  const keptParams = IMPORTANT_QUERY_PARAMS
    .filter((key) => parsed.searchParams.has(key))
    .sort()
    .map((key) => `${key}=${parsed.searchParams.get(key)}`);

  return `${parsed.origin}${parsed.pathname}${keptParams.length > 0 ? `?${keptParams.join("&")}` : ""}`;
}

function normalizeTitle(value: string | null | undefined) {
  return normalizeComparable(value);
}

export function selectMatchingCandidate(
  offer: ExistingOfferInput,
  candidates: ScrapedOfferCandidate[],
): ScrapedOfferCandidate | null {
  if (candidates.length === 0) return null;

  const byExternalId = offer.externalId
    ? candidates.find((candidate) => candidate.externalId === offer.externalId)
    : null;
  if (byExternalId) return byExternalId;

  const offerUrl = canonicalizeUrl(offer.url);
  const byUrl = candidates.find((candidate) => canonicalizeUrl(candidate.url) === offerUrl);
  if (byUrl) return byUrl;

  const offerPath = new URL(offer.url).pathname;
  const byPath = candidates.find((candidate) => new URL(candidate.url).pathname === offerPath);
  if (byPath) return byPath;

  const offerTitle = normalizeTitle(offer.title);
  const byTitle = candidates.find((candidate) => normalizeTitle(candidate.title) === offerTitle);
  if (byTitle) return byTitle;

  const byLooseTitle = candidates.find((candidate) => {
    const title = normalizeTitle(candidate.title);
    return title.includes(offerTitle) || offerTitle.includes(title);
  });
  if (byLooseTitle) return byLooseTitle;

  return candidates.length === 1 ? candidates[0] : null;
}
