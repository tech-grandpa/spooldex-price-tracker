import { pathToFileURL } from "node:url";
import { prisma } from "@/lib/prisma";
import { ensureDefaultShops, markOfferChecked, refreshOfferSnapshot, upsertOfferSnapshot } from "@/lib/data";
import { cacheRemoteImageToR2 } from "@/lib/r2";
import { confirmShopOffer, getShopScraper, scrapeShopFilament } from "@/lib/scrapers";
import type { ExistingOfferInput, ScrapeFilamentInput, ScrapedOfferCandidate } from "@/lib/scrapers/types";
import { SCRAPE_LIMIT_PER_SHOP } from "@/lib/env";
import { normalizeComparable } from "@/lib/utils";

function tokenize(value: string) {
  return normalizeComparable(value).split(" ").filter((token) => token.length > 1);
}

function getDistinctiveColorTokens(filament: ScrapeFilamentInput) {
  const source = filament.colorName || filament.series || "";
  const blockedTokens = new Set([
    ...tokenize(filament.brand),
    ...tokenize(filament.material),
    "basic", "filament", "matte", "metal", "multi", "plus", "pro", "rapid",
    "refill", "silk", "spool", "sparkle", "standard", "tough",
  ]);
  return tokenize(source).filter((token) => token.length > 2 && !blockedTokens.has(token));
}

function scoreCandidate(query: string, filament: ScrapeFilamentInput, candidate: ScrapedOfferCandidate) {
  const tokens = tokenize(query);
  const normalizedTitle = normalizeComparable(candidate.title);
  const colorTokens = getDistinctiveColorTokens(filament);
  const matchedColorTokens = colorTokens.filter((token) => normalizedTitle.includes(token));
  let score = candidate.sourceConfidence ?? 0;
  for (const token of tokens) {
    if (normalizedTitle.includes(token)) score += 1;
  }
  score += matchedColorTokens.length * 2;
  if (colorTokens.length > 0 && matchedColorTokens.length < colorTokens.length) {
    score -= 10;
  }
  if (filament.bambuCode && normalizedTitle.includes(normalizeComparable(filament.bambuCode))) {
    score += 100;
  }
  if (normalizedTitle.includes("sample")) score -= 10;
  if (candidate.totalWeightG && filament.weightG) {
    const ratio = candidate.totalWeightG / filament.weightG;
    const closenessBoost = Math.max(0, 4 - Math.abs(1 - ratio) * 10);
    score += closenessBoost;
    const unitWeightG = candidate.spoolCount > 1 ? Math.round(candidate.totalWeightG / candidate.spoolCount) : candidate.totalWeightG;
    const unitRatio = unitWeightG / filament.weightG;
    if (unitRatio < 0.75 || unitRatio > 1.25) score -= 8;
    if (candidate.packType === "single" && (ratio < 0.75 || ratio > 1.25)) score -= 8;
  }
  return score;
}

function isStrongMatch(filament: ScrapeFilamentInput, query: string, candidate: ScrapedOfferCandidate) {
  const normalizedTitle = normalizeComparable(candidate.title);
  if (filament.bambuCode && normalizedTitle.includes(normalizeComparable(filament.bambuCode))) return true;
  if (normalizedTitle.includes("sample")) return false;
  const queryTokens = tokenize(query);
  const matchedTokens = queryTokens.filter((token) => normalizedTitle.includes(token));
  const brandTokens = tokenize(filament.brand).filter((token) => token.length > 2);
  const materialTokens = tokenize(filament.material);
  const colorTokens = getDistinctiveColorTokens(filament);
  const brandMatched = brandTokens.length === 0 || brandTokens.some((token) => normalizedTitle.includes(token));
  const materialMatched = materialTokens.length === 0 || materialTokens.some((token) => normalizedTitle.includes(token));
  const colorMatched = colorTokens.length === 0 || colorTokens.every((token) => normalizedTitle.includes(token));
  if (candidate.totalWeightG && filament.weightG) {
    const ratio = candidate.totalWeightG / filament.weightG;
    const unitWeightG = candidate.spoolCount > 1 ? Math.round(candidate.totalWeightG / candidate.spoolCount) : candidate.totalWeightG;
    const unitRatio = unitWeightG / filament.weightG;
    if (unitRatio < 0.75 || unitRatio > 1.25) return false;
    if (candidate.packType === "single" && (ratio < 0.75 || ratio > 1.25)) return false;
    if (ratio < 0.5) return false;
  }
  return colorMatched && brandMatched && materialMatched && matchedTokens.length >= 2;
}

function sortFilamentsForShop(
  scraper: NonNullable<ReturnType<typeof getShopScraper>>,
  filaments: ScrapeFilamentInput[],
  scrapeState: Map<string, Date>,
  mode: "discover" | "update",
) {
  if (mode === "update") {
    // Only return filaments that already have offers for this shop.
    return [...filaments]
      .filter((f) => scrapeState.has(`${scraper.shopId}:${f.id}`))
      .sort((a, b) => {
        const aState = scrapeState.get(`${scraper.shopId}:${a.id}`)!;
        const bState = scrapeState.get(`${scraper.shopId}:${b.id}`)!;
        return aState.getTime() - bState.getTime(); // oldest first
      });
  }

  // Discovery mode only hunts for filaments that do not yet have offers at this shop.
  return [...filaments].sort((a, b) => {
    const aState = scrapeState.get(`${scraper.shopId}:${a.id}`);
    const bState = scrapeState.get(`${scraper.shopId}:${b.id}`);
    if (!aState && bState) return -1;
    if (aState && !bState) return 1;
    const aScore = scraper.scoreFilament?.(a) ?? 0;
    const bScore = scraper.scoreFilament?.(b) ?? 0;
    if (aScore !== bScore) return bScore - aScore;
    if (aState && bState && aState.getTime() !== bState.getTime()) return aState.getTime() - bState.getTime();
    return a.slug.localeCompare(b.slug);
  });
}

type ExistingOfferForUpdate = ExistingOfferInput & {
  lastCheckedAt: Date | null;
};

function sortOffersForUpdate(offers: ExistingOfferForUpdate[]) {
  return [...offers].sort((a, b) => {
    const aCheckedAt = a.etag || a.lastModifiedHeader ? 1 : 0;
    const bCheckedAt = b.etag || b.lastModifiedHeader ? 1 : 0;
    if (a.latestPriceCents == null && b.latestPriceCents != null) return -1;
    if (a.latestPriceCents != null && b.latestPriceCents == null) return 1;
    if (aCheckedAt !== bCheckedAt) return aCheckedAt - bCheckedAt;
    const aTime = a.lastCheckedAt?.getTime() ?? 0;
    const bTime = b.lastCheckedAt?.getTime() ?? 0;
    return aTime - bTime;
  });
}

async function runOfferUpdates(shopId: string, shopName: string, limit: number) {
  const offers = await prisma.offer.findMany({
    where: {
      shopId,
      items: { some: {} },
    },
    select: {
      id: true,
      shopId: true,
      externalId: true,
      url: true,
      affiliateUrl: true,
      title: true,
      imageUrl: true,
      packType: true,
      spoolCount: true,
      totalWeightG: true,
      etag: true,
      lastModifiedHeader: true,
      lastCheckedAt: true,
      latestPriceCents: true,
      latestCurrency: true,
      latestInStock: true,
      sourceConfidence: true,
    },
  });

  const selectedOffers = sortOffersForUpdate(offers).slice(0, limit);
  if (selectedOffers.length === 0) {
    console.log(`[${shopName}] update: nothing to do`);
    return;
  }

  console.log(`[${shopName}] update: ${selectedOffers.length} offers (limit ${limit})`);

  let refreshed = 0;
  let notModified = 0;
  let unmatched = 0;
  let failed = 0;

  for (const offer of selectedOffers) {
    try {
      const result = await confirmShopOffer(shopId, offer);
      if (result.status === "not-modified") {
        await markOfferChecked({
          offerId: offer.id,
          lastSeenAt: new Date(),
          etag: result.etag,
          lastModifiedHeader: result.lastModifiedHeader,
        });
        notModified++;
        continue;
      }

      if (result.status === "updated") {
        await refreshOfferSnapshot({
          offerId: offer.id,
          title: result.candidate.title,
          url: result.candidate.url,
          affiliateUrl: result.candidate.affiliateUrl,
          imageUrl: result.candidate.imageUrl || offer.imageUrl,
          priceCents: result.candidate.priceCents,
          currency: result.candidate.currency,
          inStock: result.candidate.inStock,
          packType: result.candidate.packType,
          spoolCount: result.candidate.spoolCount,
          totalWeightG: result.candidate.totalWeightG ?? offer.totalWeightG,
          sourceConfidence: result.candidate.sourceConfidence,
          lastSeenAt: new Date(),
          etag: result.etag,
          lastModifiedHeader: result.lastModifiedHeader,
          ean: result.candidate.ean,
        });
        refreshed++;
        continue;
      }

      unmatched++;
    } catch (error) {
      failed++;
      console.error(
        `[${shopName}] update failed for ${offer.url}:`,
        error instanceof Error ? error.message : error,
      );
      if (failed > 10) {
        console.error(`[${shopName}] too many update failures (${failed}) — aborting shop`);
        break;
      }
    }
  }

  const conditionalChecks = refreshed + notModified;
  const ratio = conditionalChecks > 0 ? `${Math.round((notModified / conditionalChecks) * 100)}%` : "0%";
  console.log(
    `[${shopName}] update done: ${refreshed} fetched (200), ${notModified} not modified (304), ratio ${ratio}, ${unmatched} unmatched, ${failed} failures`,
  );
}

async function runDiscoveryShop(shopId: string, shopName: string, scraper: NonNullable<ReturnType<typeof getShopScraper>>, limit: number) {
  const [filaments, offerItems] = await Promise.all([
    prisma.filament.findMany({
      select: {
        id: true, slug: true, brand: true, series: true, material: true,
        colorName: true, weightG: true, imageUrl: true, bambuCode: true, ean: true,
      },
    }),
    prisma.offerItem.findMany({
      where: { offer: { shopId } },
      select: {
        filamentId: true,
        offer: { select: { latestScrapedAt: true } },
      },
    }),
  ]);

  const scrapeState = new Map<string, Date>();
  for (const item of offerItems) {
    if (!item.offer.latestScrapedAt) continue;
    const key = `${shopId}:${item.filamentId}`;
    const existing = scrapeState.get(key);
    if (!existing || existing.getTime() < item.offer.latestScrapedAt.getTime()) {
      scrapeState.set(key, item.offer.latestScrapedAt);
    }
  }

  const supportedFilaments = filaments.filter((f) =>
    scraper.supportsFilament ? scraper.supportsFilament(f) : true,
  );
  const selectedFilaments = sortFilamentsForShop(scraper, supportedFilaments, scrapeState, "discover")
    .filter((filament) => !scrapeState.has(`${shopId}:${filament.id}`))
    .slice(0, limit);

  if (selectedFilaments.length === 0) {
    console.log(`[${shopName}] discover: nothing to do`);
    return;
  }

  console.log(`[${shopName}] discover: ${selectedFilaments.length} filaments (limit ${limit})`);
  let matched = 0;
  let failed = 0;

  for (const filament of selectedFilaments) {
    const query = scraper.queryForFilament?.(filament) ||
      [filament.brand, filament.series, filament.material, filament.colorName].filter(Boolean).join(" ");

    try {
      const candidates = await scrapeShopFilament(shopId, filament);
      if (candidates.length === 0) continue;

      const rankedCandidates = [...candidates]
        .sort((a, b) => scoreCandidate(query, filament, b) - scoreCandidate(query, filament, a))
        .filter((c, i, list) => list.findIndex((e) => e.externalId === c.externalId) === i);

      let strongMatches = scraper.trustMatching
        ? rankedCandidates
        : rankedCandidates.filter((c) => isStrongMatch(filament, query, c));

      if (scraper.multiRetailer && filament.brand) {
        const brandTokens = normalizeComparable(filament.brand).split(" ").filter((t) => t.length > 2);
        if (brandTokens.length > 0) {
          strongMatches = strongMatches.filter((c) => {
            const titleLower = normalizeComparable(c.title);
            return brandTokens.some((t) => titleLower.includes(t));
          });
        }
      }

      if (strongMatches.length === 0) continue;

      // Some retailers expose generic or mismatched product images that are not reliable
      // enough for color-specific filament variants. Keep those offers image-less and let
      // the UI fall back to canonical filament imagery / generated spool previews.
      const unreliableImageShops = new Set(["formfutura", "3dmensionals", "colorfabb"]);
      const skipImages = unreliableImageShops.has(shopId);

      for (const match of strongMatches.slice(0, 4)) {
        const cachedImage = skipImages
          ? null
          : await cacheRemoteImageToR2(
              match.imageUrl || filament.imageUrl,
              `offers/${shopId}/${match.externalId}.jpg`,
            );

        await upsertOfferSnapshot({
          shopId,
          externalId: match.externalId,
          filamentId: filament.id,
          title: match.title,
          url: match.url,
          affiliateUrl: match.affiliateUrl,
          imageUrl: skipImages ? null : cachedImage || match.imageUrl || filament.imageUrl,
          priceCents: match.priceCents,
          currency: match.currency,
          inStock: match.inStock,
          packType: match.packType,
          spoolCount: match.spoolCount,
          totalWeightG: match.totalWeightG ?? filament.weightG * match.spoolCount,
          sourceConfidence: match.sourceConfidence,
          lastSeenAt: new Date(),
          ean: match.ean,
        });
        matched++;
      }
    } catch (error) {
      failed++;
      console.error(
        `[${shopName}] discovery failed for ${filament.slug}:`,
        error instanceof Error ? error.message : error,
      );
      if (failed > 10) {
        console.error(`[${shopName}] too many failures (${failed}) — aborting shop`);
        break;
      }
    }
  }

  console.log(`[${shopName}] discover done: ${matched} offers matched, ${failed} failures`);
}

/** Get list of enabled shops */
export async function getEnabledShops(): Promise<Array<{ id: string; name: string }>> {
  await ensureDefaultShops();
  return prisma.shop.findMany({
    where: { enabled: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/** Run scraping for a single shop */
export async function runShop(shopId: string, shopName: string, mode: "discover" | "update" = "discover") {
  const scraper = getShopScraper(shopId);
  if (!scraper) {
    console.log(`[${shopName}] no scraper registered — skipping`);
    return;
  }

  const limit = SCRAPE_LIMIT_PER_SHOP;

  if (mode === "update") {
    await runOfferUpdates(shopId, shopName, limit);
    return;
  }

  await runDiscoveryShop(shopId, shopName, scraper, limit);
}

// CLI entry point
export async function run() {
  const args = new Map(
    process.argv.slice(2).map((entry) => {
      const [key, value] = entry.replace(/^--/, "").split("=");
      return [key, value ?? "true"];
    }),
  );

  const shopFilter = args.get("shop");
  const mode = (args.get("mode") as "discover" | "update") || "discover";

  const shops = await getEnabledShops();
  const filteredShops = shopFilter ? shops.filter((s) => s.id === shopFilter) : shops;

  for (const shop of filteredShops) {
    await runShop(shop.id, shop.name, mode);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  run()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
