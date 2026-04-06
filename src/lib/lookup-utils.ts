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
  colorHexes?: string[] | null;
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

function getColorHexes(input: SimilarFilamentInput) {
  const colors = input.colorHexes?.filter(Boolean) ?? [];
  if (colors.length > 0) return colors;
  return input.colorHex ? [input.colorHex] : [];
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

  const targetColors = getColorHexes(target);
  const candidateColors = getColorHexes(candidate);

  if (targetColors.length > 0 && candidateColors.length > 0) {
    const distances = targetColors.flatMap((targetColor) =>
      candidateColors.map((candidateColor) => getRgbDistance(targetColor, candidateColor)),
    );
    const minDistance = Math.min(...distances);
    score += Math.max(0, 200 - minDistance);

    const closeMatchCount = targetColors.filter((targetColor) =>
      candidateColors.some((candidateColor) => getRgbDistance(targetColor, candidateColor) < 70),
    ).length;
    score += closeMatchCount * 36;

    if (targetColors.length > 1 && candidateColors.length > 1) {
      score += 24;
    }
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
