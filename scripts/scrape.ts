import { pathToFileURL } from "node:url";
import { prisma } from "@/lib/prisma";
import { ensureDefaultShops, upsertOfferSnapshot } from "@/lib/data";
import { cacheRemoteImageToR2 } from "@/lib/r2";
import { getShopScraper, scrapeShopFilament } from "@/lib/scrapers";
import type { ScrapeFilamentInput, ScrapedOfferCandidate } from "@/lib/scrapers/types";
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
    "basic",
    "filament",
    "matte",
    "metal",
    "multi",
    "plus",
    "pro",
    "rapid",
    "refill",
    "silk",
    "spool",
    "sparkle",
    "standard",
    "tough",
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
  if (colorTokens.length > 0 && matchedColorTokens.length === 0) {
    score -= 6;
  }

  if (filament.bambuCode && normalizedTitle.includes(normalizeComparable(filament.bambuCode))) {
    score += 100;
  }

  if (normalizedTitle.includes("sample")) {
    score -= 10;
  }

  if (candidate.totalWeightG && filament.weightG) {
    const ratio = candidate.totalWeightG / filament.weightG;
    const closenessBoost = Math.max(0, 4 - Math.abs(1 - ratio) * 10);
    score += closenessBoost;

    const unitWeightG = candidate.spoolCount > 1 ? Math.round(candidate.totalWeightG / candidate.spoolCount) : candidate.totalWeightG;
    const unitRatio = unitWeightG / filament.weightG;
    if (unitRatio < 0.75 || unitRatio > 1.25) {
      score -= 8;
    }

    if (candidate.packType === "single" && (ratio < 0.75 || ratio > 1.25)) {
      score -= 8;
    }
  }

  return score;
}

function isStrongMatch(
  filament: ScrapeFilamentInput,
  query: string,
  candidate: ScrapedOfferCandidate,
) {
  const normalizedTitle = normalizeComparable(candidate.title);
  if (filament.bambuCode && normalizedTitle.includes(normalizeComparable(filament.bambuCode))) {
    return true;
  }

  if (normalizedTitle.includes("sample")) {
    return false;
  }

  const queryTokens = tokenize(query);
  const matchedTokens = queryTokens.filter((token) => normalizedTitle.includes(token));
  const matchRatio = queryTokens.length === 0 ? 0 : matchedTokens.length / queryTokens.length;
  const brandTokens = tokenize(filament.brand).filter((token) => token.length > 2);
  const materialTokens = tokenize(filament.material);
  const colorTokens = getDistinctiveColorTokens(filament);
  const brandMatched = brandTokens.length === 0 || brandTokens.some((token) => normalizedTitle.includes(token));
  const materialMatched = materialTokens.length === 0 || materialTokens.some((token) => normalizedTitle.includes(token));
  const colorMatched = colorTokens.length === 0 || colorTokens.some((token) => normalizedTitle.includes(token));

  if (candidate.totalWeightG && filament.weightG) {
    const ratio = candidate.totalWeightG / filament.weightG;
    const unitWeightG = candidate.spoolCount > 1 ? Math.round(candidate.totalWeightG / candidate.spoolCount) : candidate.totalWeightG;
    const unitRatio = unitWeightG / filament.weightG;
    if (unitRatio < 0.75 || unitRatio > 1.25) {
      return false;
    }
    if (candidate.packType === "single" && (ratio < 0.75 || ratio > 1.25)) {
      return false;
    }
    if (ratio < 0.5) {
      return false;
    }
  }

  return colorMatched && brandMatched && materialMatched && matchedTokens.length >= 2 && matchRatio >= 0.4;
}

function sortFilamentsForShop(
  scraper: NonNullable<ReturnType<typeof getShopScraper>>,
  filaments: ScrapeFilamentInput[],
  scrapeState: Map<string, Date>,
) {
  return [...filaments].sort((a, b) => {
    const aState = scrapeState.get(`${scraper.shopId}:${a.id}`);
    const bState = scrapeState.get(`${scraper.shopId}:${b.id}`);

    // Never-scraped filaments always come first
    if (!aState && bState) return -1;
    if (aState && !bState) return 1;

    // Among never-scraped, prefer higher scraper scores
    const aScore = scraper.scoreFilament?.(a) ?? 0;
    const bScore = scraper.scoreFilament?.(b) ?? 0;
    if (aScore !== bScore) return bScore - aScore;

    // Among already-scraped, oldest first
    if (aState && bState && aState.getTime() !== bState.getTime()) {
      return aState.getTime() - bState.getTime();
    }

    return a.slug.localeCompare(b.slug);
  });
}

export async function run() {
  const args = new Map(
    process.argv.slice(2).map((entry) => {
      const [key, value] = entry.replace(/^--/, "").split("=");
      return [key, value ?? "true"];
    }),
  );

  const shopFilter = args.get("shop");
  const limit = Number(args.get("limit") || String(SCRAPE_LIMIT_PER_SHOP));

  await ensureDefaultShops();

  const [filaments, shops, offerItems] = await Promise.all([
    prisma.filament.findMany({
      select: {
        id: true,
        slug: true,
        brand: true,
        series: true,
        material: true,
        colorName: true,
        weightG: true,
        imageUrl: true,
        bambuCode: true,
        ean: true,
      },
    }),
    prisma.shop.findMany({
      where: {
        enabled: true,
        ...(shopFilter ? { id: shopFilter } : {}),
      },
    }),
    prisma.offerItem.findMany({
      select: {
        filamentId: true,
        offer: {
          select: {
            shopId: true,
            latestScrapedAt: true,
          },
        },
      },
    }),
  ]);

  const scrapeState = new Map<string, Date>();
  for (const item of offerItems) {
    if (!item.offer.latestScrapedAt) continue;
    const key = `${item.offer.shopId}:${item.filamentId}`;
    const existing = scrapeState.get(key);
    if (!existing || existing.getTime() < item.offer.latestScrapedAt.getTime()) {
      scrapeState.set(key, item.offer.latestScrapedAt);
    }
  }

  for (const shop of shops) {
    const scraper = getShopScraper(shop.id);
    if (!scraper) continue;

    const supportedFilaments = filaments.filter((filament) =>
      scraper.supportsFilament ? scraper.supportsFilament(filament) : true,
    );
    const selectedFilaments = sortFilamentsForShop(scraper, supportedFilaments, scrapeState).slice(0, limit);

    console.log(`\n[${shop.name}] scraping ${selectedFilaments.length} filaments (limit ${limit})`);

    for (const filament of selectedFilaments) {
      const query = scraper.queryForFilament?.(filament) ||
        [filament.brand, filament.series, filament.material, filament.colorName].filter(Boolean).join(" ");

      try {
        const candidates = await scrapeShopFilament(shop.id, filament);
        if (candidates.length === 0) continue;

        const rankedCandidates = [...candidates]
          .sort((a, b) => scoreCandidate(query, filament, b) - scoreCandidate(query, filament, a))
          .filter((candidate, index, list) =>
            list.findIndex((entry) => entry.externalId === candidate.externalId) === index,
          );
        const strongMatches = rankedCandidates.filter((candidate) => isStrongMatch(filament, query, candidate));

        if (strongMatches.length === 0) {
          const best = rankedCandidates[0];
          if (best) {
            console.log(`  skipped weak match for ${filament.slug} -> ${best.title}`);
          }
          continue;
        }

        const selectedMatches = strongMatches.slice(0, 4);
        for (const match of selectedMatches) {
          const cachedImage = await cacheRemoteImageToR2(
            match.imageUrl || filament.imageUrl,
            `offers/${shop.id}/${match.externalId}.jpg`,
          );

          await upsertOfferSnapshot({
            shopId: shop.id,
            externalId: match.externalId,
            filamentId: filament.id,
            title: match.title,
            url: match.url,
            affiliateUrl: match.affiliateUrl,
            imageUrl: cachedImage || match.imageUrl || filament.imageUrl,
            priceCents: match.priceCents,
            currency: match.currency,
            inStock: match.inStock,
            packType: match.packType,
            spoolCount: match.spoolCount,
            totalWeightG: match.totalWeightG ?? filament.weightG * match.spoolCount,
            sourceConfidence: match.sourceConfidence,
            lastSeenAt: new Date(),
          });

          console.log(
            `  matched ${filament.slug} -> ${match.title}${match.packType !== "single" ? ` (${match.spoolCount}x)` : ""}`,
          );
        }

        scrapeState.set(`${shop.id}:${filament.id}`, new Date());
      } catch (error) {
        console.error(`  failed ${filament.slug}:`, error);
      }
    }
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
