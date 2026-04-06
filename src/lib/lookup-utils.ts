import { hexToRgb } from "@/lib/color-utils";
import { normalizeComparable } from "@/lib/utils";

interface LookupOfferOrderInput {
  priceCents: number | null;
  affiliateUrl: string | null;
}

interface SimilarFilamentInput {
  brand: string;
  series: string | null;
  material: string;
  colorName: string | null;
  colorHex: string | null;
}

function tokenizeColor(value: string | null | undefined) {
  return normalizeComparable(value)
    .split(" ")
    .filter((token) => token.length > 2);
}

function getRgbDistance(aHex: string, bHex: string) {
  const a = hexToRgb(aHex);
  const b = hexToRgb(bHex);
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

export function compareLookupOfferOrder(a: LookupOfferOrderInput, b: LookupOfferOrderInput) {
  const aPrice = a.priceCents ?? Number.MAX_SAFE_INTEGER;
  const bPrice = b.priceCents ?? Number.MAX_SAFE_INTEGER;
  if (aPrice !== bPrice) return aPrice - bPrice;

  const aAffiliateRank = a.affiliateUrl ? 0 : 1;
  const bAffiliateRank = b.affiliateUrl ? 0 : 1;
  return aAffiliateRank - bAffiliateRank;
}

export function buildLookupFilamentName(filament: {
  series: string | null;
  material: string;
  colorName: string | null;
}) {
  return [filament.series ?? filament.material, filament.colorName].filter(Boolean).join(" ").trim();
}

export function getSimilarFilamentScore(target: SimilarFilamentInput, candidate: SimilarFilamentInput) {
  let score = 0;

  if (target.colorHex && candidate.colorHex) {
    score += Math.max(0, 200 - getRgbDistance(target.colorHex, candidate.colorHex));
  }

  const targetTokens = tokenizeColor(target.colorName);
  const candidateText = normalizeComparable(
    [candidate.colorName, candidate.series, candidate.material].filter(Boolean).join(" "),
  );

  for (const token of targetTokens) {
    if (candidateText.includes(token)) {
      score += 24;
    }
  }

  if (normalizeComparable(target.colorName) && normalizeComparable(target.colorName) === normalizeComparable(candidate.colorName)) {
    score += 30;
  }

  if (normalizeComparable(target.series) && normalizeComparable(target.series) === normalizeComparable(candidate.series)) {
    score += 8;
  }

  return score;
}
