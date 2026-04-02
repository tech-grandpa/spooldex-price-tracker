import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildAbsoluteUrl, computePricePerKgCents, formatFreshness, normalizeComparable, slugify } from "@/lib/utils";
import { DEFAULT_MARKET } from "@/lib/env";

/** Build a Prisma where clause for shops filtered by region */
function shopWhereByRegion(region?: string | null): Prisma.ShopWhereInput {
  return {
    enabled: true,
    ...(region ? { regions: { has: region } } : { market: DEFAULT_MARKET }),
  };
}

const offerInclude = {
  shop: true,
  items: {
    include: {
      filament: true,
    },
  },
  snapshots: {
    orderBy: { scrapedAt: "desc" },
    take: 8,
  },
} satisfies Prisma.OfferInclude;

type OfferWithRelations = Prisma.OfferGetPayload<{ include: typeof offerInclude }>;

function tokenizeComparable(value: string | null | undefined) {
  return normalizeComparable(value)
    .split(" ")
    .filter(Boolean);
}

function getDistinctiveLookupTokens(value: string | null | undefined, blockedSource: string[] = []) {
  const blocked = new Set([
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
    ...blockedSource.flatMap((entry) => tokenizeComparable(entry)),
  ]);

  return tokenizeComparable(value).filter((token) => token.length > 2 && !blocked.has(token));
}

function countMatchingTokens(haystack: string, tokens: string[]) {
  return tokens.filter((token) => haystack.includes(token)).length;
}

function hasAllTokens(haystack: string, tokens: string[]) {
  return tokens.length > 0 && tokens.every((token) => haystack.includes(token));
}

function sortOffers(a: OfferWithRelations, b: OfferWithRelations) {
  const aSingle = a.packType === "single" ? 0 : 1;
  const bSingle = b.packType === "single" ? 0 : 1;
  if (aSingle !== bSingle) return aSingle - bSingle;
  const aPrice = a.latestPricePerKgCents ?? a.latestPriceCents ?? Number.MAX_SAFE_INTEGER;
  const bPrice = b.latestPricePerKgCents ?? b.latestPriceCents ?? Number.MAX_SAFE_INTEGER;
  return aPrice - bPrice;
}

function serializeOffer(offer: OfferWithRelations) {
  return {
    id: offer.id,
    slug: offer.slug,
    title: offer.title,
    url: offer.url,
    affiliateUrl: offer.affiliateUrl || offer.url,
    packType: offer.packType,
    spoolCount: offer.spoolCount,
    totalWeightG: offer.totalWeightG,
    imageUrl: offer.imageUrl,
    lastCheckedAt: offer.lastCheckedAt,
    lastSeenAt: offer.lastSeenAt,
    freshnessLabel: formatFreshness(offer.latestScrapedAt ?? offer.lastCheckedAt),
    scrapeStatus: offer.scrapeStatus,
    sourceConfidence: offer.sourceConfidence,
    latestPriceCents: offer.latestPriceCents,
    latestCurrency: offer.latestCurrency || "EUR",
    latestPricePerKgCents: offer.latestPricePerKgCents,
    latestInStock: offer.latestInStock,
    latestScrapedAt: offer.latestScrapedAt,
    shop: {
      id: offer.shop.id,
      name: offer.shop.name,
      market: offer.shop.market,
      baseUrl: offer.shop.baseUrl,
    },
    items: offer.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      weightG: item.weightG,
      colorName: item.colorName,
      colorHex: item.colorHex,
      filament: {
        id: item.filament.id,
        slug: item.filament.slug,
        brand: item.filament.brand,
        series: item.filament.series,
        material: item.filament.material,
        colorName: item.filament.colorName,
      },
    })),
    snapshots: offer.snapshots.map((snapshot) => ({
      id: snapshot.id,
      priceCents: snapshot.priceCents,
      currency: snapshot.currency,
      pricePerKgCents: snapshot.pricePerKgCents,
      inStock: snapshot.inStock,
      scrapedAt: snapshot.scrapedAt,
    })),
  };
}

async function getShopSummaries(region?: string | null) {
  const shops = await prisma.shop.findMany({
    where: shopWhereByRegion(region),
    orderBy: { name: "asc" },
    include: {
      offers: {
        where: { latestPriceCents: { not: null } },
        include: {
          items: true,
        },
      },
    },
  });

  return shops.map((shop) => {
    const latestOfferDate = shop.offers.reduce<Date | null>((latest, offer) => {
      if (!offer.latestScrapedAt) return latest;
      if (!latest || latest.getTime() < offer.latestScrapedAt.getTime()) return offer.latestScrapedAt;
      return latest;
    }, null);

    const filamentIds = new Set(shop.offers.flatMap((offer) => offer.items.map((item) => item.filamentId)));
    const packOffers = shop.offers.filter((offer) => offer.packType !== "single");
    const cheapestOffer = [...shop.offers].sort((a, b) => {
      const aSingle = a.packType === "single" ? 0 : 1;
      const bSingle = b.packType === "single" ? 0 : 1;
      if (aSingle !== bSingle) return aSingle - bSingle;
      const aPrice = a.latestPricePerKgCents ?? a.latestPriceCents ?? Number.MAX_SAFE_INTEGER;
      const bPrice = b.latestPricePerKgCents ?? b.latestPriceCents ?? Number.MAX_SAFE_INTEGER;
      return aPrice - bPrice;
    })[0] ?? null;

    return {
      id: shop.id,
      name: shop.name,
      market: shop.market,
      baseUrl: shop.baseUrl,
      offerCount: shop.offers.length,
      filamentCount: filamentIds.size,
      packOfferCount: packOffers.length,
      lastCheckedAt: latestOfferDate,
      freshnessLabel: formatFreshness(latestOfferDate),
      cheapestOffer: cheapestOffer
        ? {
            title: cheapestOffer.title,
            latestPriceCents: cheapestOffer.latestPriceCents,
            latestCurrency: cheapestOffer.latestCurrency || "EUR",
            packType: cheapestOffer.packType,
            spoolCount: cheapestOffer.spoolCount,
          }
        : null,
    };
  });
}

async function getOffersForFilamentId(filamentId: string) {
  const offers = await prisma.offer.findMany({
    where: {
      shop: { market: DEFAULT_MARKET, enabled: true },
      items: { some: { filamentId } },
    },
    include: offerInclude,
  });

  return offers.sort(sortOffers);
}

async function getEquivalentOffersForFilament(filament: {
  id: string;
  brand: string;
  series: string | null;
  material: string;
  colorName: string | null;
  weightG: number;
}) {
  const siblings = await prisma.filament.findMany({
    where: {
      id: { not: filament.id },
      brand: filament.brand,
      weightG: filament.weightG,
      ...(filament.colorName
        ? {
            colorName: {
              equals: filament.colorName,
              mode: "insensitive",
            },
          }
        : {}),
    },
    take: 12,
  });

  if (siblings.length === 0) return [];

  const scoredSiblings = siblings
    .map((candidate) => {
      const candidateSeries = normalizeComparable(candidate.series);
      const candidateMaterial = normalizeComparable(candidate.material);
      const targetSeries = normalizeComparable(filament.series);
      const targetMaterial = normalizeComparable(filament.material);
      let score = 0;

      if (targetSeries && candidateSeries === targetSeries) score += 8;
      if (targetMaterial && candidateMaterial === targetMaterial) score += 6;
      if (targetSeries && candidateMaterial.includes(targetSeries)) score += 4;
      if (targetMaterial && candidateSeries.includes(targetMaterial)) score += 2;

      return { candidate, score };
    })
    .sort((a, b) => b.score - a.score);

  for (const entry of scoredSiblings) {
    const offers = await getOffersForFilamentId(entry.candidate.id);
    if (offers.length > 0) return offers;
  }

  return [];
}

async function getBestOffersForFilamentIds(filamentIds: string[]) {
  if (filamentIds.length === 0) return new Map<string, ReturnType<typeof serializeOffer>>();

  const offers = await prisma.offer.findMany({
    where: {
      shop: { market: DEFAULT_MARKET, enabled: true },
      latestPriceCents: { not: null },
      items: {
        some: {
          filamentId: {
            in: filamentIds,
          },
        },
      },
    },
    include: offerInclude,
  });

  const bestOffers = new Map<string, ReturnType<typeof serializeOffer>>();
  for (const offer of offers.sort(sortOffers)) {
    for (const item of offer.items) {
      if (!filamentIds.includes(item.filamentId)) continue;
      if (!bestOffers.has(item.filamentId)) {
        bestOffers.set(item.filamentId, serializeOffer(offer));
      }
    }
  }

  return bestOffers;
}

export async function getHomePageData(query?: string) {
  const normalizedQuery = normalizeComparable(query);
  const filamentWhere: Prisma.FilamentWhereInput = normalizedQuery
    ? {
        OR: [
          { brand: { contains: normalizedQuery, mode: "insensitive" } },
          { series: { contains: normalizedQuery, mode: "insensitive" } },
          { material: { contains: normalizedQuery, mode: "insensitive" } },
          { colorName: { contains: normalizedQuery, mode: "insensitive" } },
        ],
      }
    : {};

  const [stats, brands, materials, shopSummaries, featuredFilaments, fallbackFilaments, recentOffers] = await Promise.all([
    Promise.all([
      prisma.filament.count(),
      prisma.shop.count({ where: { market: DEFAULT_MARKET, enabled: true } }),
      prisma.offer.count({ where: { shop: { market: DEFAULT_MARKET, enabled: true }, latestPriceCents: { not: null } } }),
      prisma.filament.count({
        where: {
          offerItems: {
            some: {
              offer: {
                shop: { market: DEFAULT_MARKET, enabled: true },
                latestPriceCents: { not: null },
              },
            },
          },
        },
      }),
    ]),
    prisma.filament.groupBy({
      by: ["brand"],
      orderBy: { brand: "asc" },
    }),
    prisma.filament.groupBy({
      by: ["material"],
      orderBy: { material: "asc" },
    }),
    getShopSummaries(),
    normalizedQuery
      ? prisma.filament.findMany({
          where: filamentWhere,
          orderBy: { updatedAt: "desc" },
          take: 18,
        })
      : prisma.filament.findMany({
          where: {
            offerItems: {
              some: {
                offer: {
                  shop: { market: DEFAULT_MARKET, enabled: true },
                  latestPriceCents: { not: null },
                },
              },
            },
          },
          orderBy: { updatedAt: "desc" },
          take: 12,
        }),
    normalizedQuery
      ? prisma.filament.findMany({
          where: { id: "__unused__" },
          take: 0,
        })
      : prisma.filament.findMany({
          orderBy: { updatedAt: "desc" },
          take: 24,
        }),
    prisma.offer.findMany({
      where: {
        shop: { market: DEFAULT_MARKET, enabled: true },
        latestPriceCents: { not: null },
      },
      include: offerInclude,
      orderBy: { latestScrapedAt: "desc" },
      take: 8,
    }),
  ]);

  const filaments = normalizedQuery
    ? featuredFilaments
    : [
        ...featuredFilaments,
        ...fallbackFilaments.filter((candidate) =>
          !featuredFilaments.some((featured) => featured.id === candidate.id),
        ),
      ].slice(0, 12);

  const bestOffers = await getBestOffersForFilamentIds(filaments.map((filament) => filament.id));

  return {
    stats: {
      filamentCount: stats[0],
      shopCount: stats[1],
      offerCount: stats[2],
      pricedFilamentCount: stats[3],
    },
    brands: brands.map((entry) => ({
      name: entry.brand,
      slug: slugify(entry.brand),
    })),
    materials: materials.map((entry) => ({
      name: entry.material,
      slug: slugify(entry.material),
    })),
    shops: shopSummaries,
    filaments: filaments.map((filament) => ({
      ...filament,
      href: `/filaments/${filament.slug}`,
      bestOffer: bestOffers.get(filament.id) ?? null,
    })),
    recentOffers: recentOffers.sort(sortOffers).map(serializeOffer),
  };
}

export async function getBrandPageData(brandSlug: string) {
  const filaments = await prisma.filament.findMany({
    where: {
      brand: {
        contains: brandSlug.replaceAll("-", " "),
        mode: "insensitive",
      },
    },
    orderBy: [{ brand: "asc" }, { series: "asc" }, { colorName: "asc" }],
  });

  if (filaments.length === 0) return null;

  const bestOffers = await getBestOffersForFilamentIds(filaments.map((filament) => filament.id));

  return {
    brand: filaments[0]?.brand ?? brandSlug,
    filaments: filaments.map((filament) => ({
      ...filament,
      href: `/filaments/${filament.slug}`,
      imageUrl: filament.imageUrl || null,
      bestOffer: bestOffers.get(filament.id) ?? null,
    })),
  };
}

export async function getMaterialsIndexPageData() {
  const filaments = await prisma.filament.findMany({
    orderBy: [{ material: "asc" }, { brand: "asc" }, { series: "asc" }, { colorName: "asc" }],
  });

  const bestOffers = await getBestOffersForFilamentIds(filaments.map((filament) => filament.id));
  const grouped = new Map<
    string,
    {
      material: string;
      slug: string;
      totalCount: number;
      pricedCount: number;
      representative: (typeof filaments)[number];
      representativeOffer: ReturnType<typeof serializeOffer> | null;
    }
  >();

  for (const filament of filaments) {
    const bestOffer = bestOffers.get(filament.id) ?? null;
    const existing = grouped.get(filament.material);
    if (!existing) {
      grouped.set(filament.material, {
        material: filament.material,
        slug: slugify(filament.material),
        totalCount: 1,
        pricedCount: bestOffer ? 1 : 0,
        representative: filament,
        representativeOffer: bestOffer,
      });
      continue;
    }

    existing.totalCount += 1;
    if (bestOffer) existing.pricedCount += 1;

    const existingPrice = existing.representativeOffer?.latestPricePerKgCents ?? Number.MAX_SAFE_INTEGER;
    const nextPrice = bestOffer?.latestPricePerKgCents ?? Number.MAX_SAFE_INTEGER;
    const existingHasVisual = !!(existing.representative.imageUrl || existing.representative.colorHex);
    const nextHasVisual = !!(filament.imageUrl || filament.colorHex);
    // Prefer: has image > has colorHex > cheaper price
    if (
      (!existing.representative.imageUrl && filament.imageUrl) ||
      (!existingHasVisual && nextHasVisual) ||
      (existingHasVisual === nextHasVisual && nextPrice < existingPrice)
    ) {
      existing.representative = filament;
      existing.representativeOffer = bestOffer;
    }
  }

  return {
    materials: [...grouped.values()]
      .sort((a, b) =>
        b.pricedCount - a.pricedCount ||
        b.totalCount - a.totalCount ||
        a.material.localeCompare(b.material),
      )
      .map((entry) => ({
        ...entry.representative,
        name: entry.material,
        href: `/materials/${entry.slug}`,
        imageUrl: entry.representative.imageUrl || null,
        bestOffer: entry.representativeOffer,
        totalCount: entry.totalCount,
        pricedCount: entry.pricedCount,
      })),
  };
}

export async function getMaterialPageData(materialSlug: string) {
  const spaced = materialSlug.replaceAll("-", " ");
  const hyphenated = materialSlug.toUpperCase(); // PA12-CF, PETG-CF, etc.

  const [filaments, materials] = await Promise.all([
    prisma.filament.findMany({
      where: {
        OR: [
          { material: { equals: hyphenated, mode: "insensitive" } },
          { material: { contains: spaced, mode: "insensitive" } },
        ],
      },
      orderBy: [{ brand: "asc" }, { colorName: "asc" }],
    }),
    prisma.filament.groupBy({
      by: ["material"],
      orderBy: { material: "asc" },
    }),
  ]);

  if (filaments.length === 0) return null;

  const bestOffers = await getBestOffersForFilamentIds(filaments.map((filament) => filament.id));

  return {
    material: filaments[0]?.material ?? materialSlug,
    materials: materials.map((entry) => ({
      name: entry.material,
      slug: slugify(entry.material),
    })),
    filaments: filaments.map((filament) => ({
      ...filament,
      href: `/filaments/${filament.slug}`,
      imageUrl: filament.imageUrl || null,
      bestOffer: bestOffers.get(filament.id) ?? null,
    })),
  };
}

export async function getShopPageData(shopId: string) {
  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    include: {
      offers: {
        where: { latestPriceCents: { not: null } },
        include: offerInclude,
        orderBy: { latestScrapedAt: "desc" },
        take: 60,
      },
    },
  });

  if (!shop) return null;

  const singleOffers = shop.offers.filter((offer) => offer.packType === "single").sort(sortOffers);
  const packOffers = shop.offers.filter((offer) => offer.packType !== "single").sort(sortOffers);
  const filamentIds = new Set(shop.offers.flatMap((offer) => offer.items.map((item) => item.filamentId)));
  const latestCheckedAt = shop.offers.reduce<Date | null>((latest, offer) => {
    if (!offer.latestScrapedAt) return latest;
    if (!latest || latest.getTime() < offer.latestScrapedAt.getTime()) return offer.latestScrapedAt;
    return latest;
  }, null);

  return {
    shop,
    stats: {
      offerCount: shop.offers.length,
      filamentCount: filamentIds.size,
      packOfferCount: packOffers.length,
      lastCheckedAt: latestCheckedAt,
      freshnessLabel: formatFreshness(latestCheckedAt),
    },
    offers: shop.offers.sort(sortOffers).map(serializeOffer),
    singleOffers: singleOffers.map(serializeOffer),
    packOffers: packOffers.map(serializeOffer),
  };
}

export async function getShopsIndexPageData(region?: string | null) {
  const allShops = await prisma.shop.findMany({
    orderBy: { name: "asc" },
    include: {
      offers: {
        where: { latestPriceCents: { not: null } },
        include: { items: true },
      },
    },
  });

  const shops = allShops.map((shop) => {
    const filamentIds = new Set(shop.offers.flatMap((o) => o.items.map((i) => i.filamentId)));
    const latestDate = shop.offers.reduce<Date | null>((latest, o) => {
      if (!o.latestScrapedAt) return latest;
      if (!latest || latest.getTime() < o.latestScrapedAt.getTime()) return o.latestScrapedAt;
      return latest;
    }, null);
    return {
      id: shop.id,
      name: shop.name,
      market: shop.market,
      regions: shop.regions,
      baseUrl: shop.baseUrl,
      offerCount: shop.offers.length,
      filamentCount: filamentIds.size,
      lastCheckedAt: latestDate,
      freshnessLabel: formatFreshness(latestDate),
    };
  });

  // If region is specified, filter; otherwise show all
  const filteredShops = region
    ? shops.filter((s) => s.regions.includes(region))
    : shops;

  const recentOffers = await prisma.offer.findMany({
    where: {
      shop: shopWhereByRegion(region),
      latestPriceCents: { not: null },
    },
    include: offerInclude,
    orderBy: { latestScrapedAt: "desc" },
    take: 12,
  });

  return {
    shops: filteredShops,
    allShops: shops,
    recentOffers: recentOffers.sort(sortOffers).map(serializeOffer),
  };
}

export async function getFilamentDetail(idOrSlug: string) {
  const filament = await prisma.filament.findFirst({
    where: {
      OR: [{ id: idOrSlug }, { slug: idOrSlug }],
    },
  });

  if (!filament) return null;

  const [directOffers, related] = await Promise.all([
    getOffersForFilamentId(filament.id),
    // Show similar filaments from OTHER brands: same material, similar color — cheapest first
    (async () => {
      const colorTokens = normalizeComparable(filament.colorName)
        .split(" ")
        .filter((t) => t.length > 2);

      // Find filaments with same material from different brands
      const candidates = await prisma.filament.findMany({
        where: {
          id: { not: filament.id },
          brand: { not: filament.brand },
          material: filament.material,
          ...(filament.colorHex ? { colorHex: { not: null } } : {}),
        },
        take: 200,
      });

      // Score by color similarity
      const scored = candidates.map((c) => {
        let score = 0;
        if (filament.colorHex && c.colorHex) {
          // Simple hex distance
          const [r1, g1, b1] = [parseInt(filament.colorHex.slice(1, 3), 16), parseInt(filament.colorHex.slice(3, 5), 16), parseInt(filament.colorHex.slice(5, 7), 16)];
          const [r2, g2, b2] = [parseInt((c.colorHex ?? "#808080").slice(1, 3), 16), parseInt((c.colorHex ?? "#808080").slice(3, 5), 16), parseInt((c.colorHex ?? "#808080").slice(5, 7), 16)];
          const dist = Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
          score += Math.max(0, 100 - dist); // closer color = higher score
        }
        // Boost if color name tokens match
        const cTokens = normalizeComparable(c.colorName).split(" ");
        for (const t of colorTokens) {
          if (cTokens.includes(t)) score += 20;
        }
        return { filament: c, score };
      });

      return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map((s) => s.filament);
    })(),
  ]);

  const offers = directOffers.length > 0 ? directOffers : await getEquivalentOffersForFilament(filament);
  const serializedOffers = offers.map(serializeOffer);
  const relatedBestOffers = await getBestOffersForFilamentIds(related.map((entry) => entry.id));

  // Collect all unique images: filament canonical + color-matched offer images (deduped)
  const allImages = collectUniqueImages(filament, serializedOffers);

  return {
    filament: {
      ...filament,
      href: `/filaments/${filament.slug}`,
      canonicalUrl: buildAbsoluteUrl(`/filaments/${filament.slug}`),
    },
    images: allImages,
    offers: serializedOffers,
    priceHistory: offers.flatMap((offer) =>
      offer.snapshots.map((snapshot) => ({
        offerId: offer.id,
        shopId: offer.shop.id,
        shopName: offer.shop.name,
        priceCents: snapshot.priceCents,
        currency: snapshot.currency,
        scrapedAt: snapshot.scrapedAt,
      })),
    ).sort((a, b) => a.scrapedAt.getTime() - b.scrapedAt.getTime()),
    related: related.map((entry) => ({
      ...entry,
      href: `/filaments/${entry.slug}`,
      imageUrl: entry.imageUrl || null,
      bestOffer: relatedBestOffers.get(entry.id) ?? null,
    })),
  };
}

/** Collect unique images from filament + color-matched offers, deduplicating scaled variants */
function collectUniqueImages(
  filament: { imageUrl: string | null; colorName: string | null; series: string | null; material: string },
  offers: Array<{ imageUrl: string | null; title: string }>,
): string[] {
  const urls: string[] = [];
  const seenBases = new Set<string>();

  function normalizeForDedup(url: string): string {
    return url
      .replace(/[?#].*$/, "")
      .replace(/-(?:mix-\d+|thumb|small|medium|large|full|\d+x\d+)(?=\.\w+$)/, "")
      .replace(/\/(?:thumb|preview|small|medium|large|full)\//, "/normalized/")
      .toLowerCase();
  }

  function addImage(url: string | null) {
    if (!url) return;
    const base = normalizeForDedup(url);
    if (seenBases.has(base)) return;
    seenBases.add(base);
    urls.push(url);
  }

  /** Check if an offer title is a plausible color match for this filament */
  function isColorRelevant(offerTitle: string): boolean {
    if (!filament.colorName) return true; // can't verify, allow it

    const normalizedTitle = normalizeComparable(offerTitle);
    const colorTokens = normalizeComparable(filament.colorName)
      .split(" ")
      .filter((t) => t.length > 2);

    // If the filament has a specific color name, the offer title should contain it
    // (or at least most of its distinctive tokens)
    if (colorTokens.length === 0) return true;
    const matched = colorTokens.filter((token) => normalizedTitle.includes(token));
    return matched.length >= Math.max(1, Math.ceil(colorTokens.length * 0.5));
  }

  // Filament canonical image first
  addImage(filament.imageUrl);

  // Only include images from offers that match this filament's color
  for (const offer of offers) {
    if (offer.imageUrl && isColorRelevant(offer.title)) {
      addImage(offer.imageUrl);
    }
  }

  return urls;
}

export async function listApiFilaments({
  brand,
  material,
  q,
}: {
  brand?: string;
  material?: string;
  q?: string;
}) {
  const where: Prisma.FilamentWhereInput = {
    ...(brand
      ? { brand: { contains: brand, mode: "insensitive" } }
      : {}),
    ...(material
      ? { material: { contains: material, mode: "insensitive" } }
      : {}),
    ...(q
      ? {
          OR: [
            { brand: { contains: q, mode: "insensitive" } },
            { series: { contains: q, mode: "insensitive" } },
            { material: { contains: q, mode: "insensitive" } },
            { colorName: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const filaments = await prisma.filament.findMany({
    where,
    orderBy: [{ brand: "asc" }, { series: "asc" }, { colorName: "asc" }],
    take: 100,
  });

  return Promise.all(
    filaments.map(async (filament) => {
      const bestOffer = await prisma.offer.findFirst({
        where: {
          items: { some: { filamentId: filament.id } },
          latestPriceCents: { not: null },
          shop: { market: DEFAULT_MARKET, enabled: true },
        },
        include: { shop: true },
        orderBy: [{ latestPricePerKgCents: "asc" }, { latestPriceCents: "asc" }],
      });

      return {
        ...filament,
        canonicalUrl: buildAbsoluteUrl(`/filaments/${filament.slug}`),
        bestOffer: bestOffer
          ? {
              id: bestOffer.id,
              shop: bestOffer.shop.name,
              priceCents: bestOffer.latestPriceCents,
              currency: bestOffer.latestCurrency,
            }
          : null,
      };
    }),
  );
}

export async function listShops() {
  return getShopSummaries();
}

export async function getOffersForApi(idOrSlug: string) {
  const detail = await getFilamentDetail(idOrSlug);
  return detail ? detail.offers : null;
}

export async function getPriceHistoryForApi(idOrSlug: string) {
  const detail = await getFilamentDetail(idOrSlug);
  return detail ? detail.priceHistory : null;
}

async function getNormalizedLookupCandidates(params: {
  brand?: string | null;
  material?: string | null;
  series?: string | null;
  colorName?: string | null;
  weightG?: string | null;
}) {
  if (!params.brand || (!params.material && !params.series && !params.colorName)) {
    return [];
  }

  const candidates = await prisma.filament.findMany({
    where: {
      brand: { contains: params.brand, mode: "insensitive" },
      OR: [
        params.material
          ? {
              material: {
                contains: params.material,
                mode: "insensitive",
              },
            }
          : undefined,
        params.series
          ? {
              series: {
                contains: params.series,
                mode: "insensitive",
              },
            }
          : undefined,
        params.colorName
          ? {
              colorName: {
                contains: params.colorName,
                mode: "insensitive",
              },
            }
          : undefined,
      ].filter(Boolean) as Prisma.FilamentWhereInput[],
    },
    take: 400,
  });

  const normalizedBrand = normalizeComparable(params.brand);
  const normalizedMaterial = normalizeComparable(params.material);
  const normalizedSeries = normalizeComparable(params.series);
  const targetColor = normalizeComparable(params.colorName);
  const targetWeight = Number(params.weightG || "0");
  const colorTokens = getDistinctiveLookupTokens(params.colorName, [params.brand || "", params.material || ""]);

  return candidates
    .map((candidate) => {
      const candidateBrand = normalizeComparable(candidate.brand);
      const candidateMaterial = normalizeComparable(candidate.material);
      const candidateSeries = normalizeComparable(candidate.series);
      const candidateColor = normalizeComparable(candidate.colorName);
      const candidateText = [candidateSeries, candidateColor, candidateMaterial].filter(Boolean).join(" ");
      const colorTokenMatches = countMatchingTokens(candidateText, colorTokens);
      const strongColorMatch =
        colorTokens.length === 0 ||
        candidateColor === targetColor ||
        candidateSeries === targetColor ||
        hasAllTokens(candidateText, colorTokens);

      let score = 0;
      if (candidateBrand === normalizedBrand) score += 8;
      if (normalizedSeries && candidateSeries === normalizedSeries) score += 12;
      if (normalizedSeries && candidateColor === normalizedSeries) score += 9;
      if (targetColor && candidateColor === targetColor) score += 10;
      if (targetColor && candidateSeries === targetColor) score += 8;
      if (normalizedMaterial && candidateMaterial === normalizedMaterial) score += 6;
      if (normalizedMaterial && candidateMaterial.includes(normalizedMaterial)) score += 3;
      if (normalizedSeries && candidateText.includes(normalizedSeries)) score += 4;
      if (targetWeight > 0 && candidate.weightG === targetWeight) score += 6;
      score += colorTokenMatches * 3;
      if (colorTokens.length > 0 && !strongColorMatch) score -= 20;

      return { candidate, score, strongColorMatch };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
}

export async function lookupOffers(params: {
  ean?: string | null;
  bambuCode?: string | null;
  brand?: string | null;
  material?: string | null;
  series?: string | null;
  colorName?: string | null;
  weightG?: string | null;
}) {
  const ean = params.ean?.trim() || "";
  const bambuCode = params.bambuCode?.trim() || "";

  let filament =
    (ean
      ? await prisma.filament.findFirst({ where: { ean } })
      : null) ||
    (bambuCode
      ? await prisma.filament.findFirst({ where: { bambuCode } })
      : null);

  let matchedBy: string | null = filament
    ? (ean ? "ean" : "bambuCode")
    : null;
  let normalizedCandidates: Awaited<ReturnType<typeof getNormalizedLookupCandidates>> = [];

  if (!filament) {
    normalizedCandidates = await getNormalizedLookupCandidates(params);
    filament = normalizedCandidates[0]?.candidate ?? null;
    matchedBy = filament ? "normalized" : null;
  }

  if (!filament) return null;

  let offers = await getOffersForFilamentId(filament.id);
  if (offers.length === 0 && normalizedCandidates.length > 0) {
    for (const candidate of normalizedCandidates) {
      if (candidate.candidate.id === filament.id) continue;
      offers = await getOffersForFilamentId(candidate.candidate.id);
      if (offers.length > 0) break;
    }
  }

  return {
    matchedBy,
    filament: {
      ...filament,
      canonicalUrl: buildAbsoluteUrl(`/filaments/${filament.slug}`),
    },
    offers: offers.map(serializeOffer),
  };
}

export const REGIONS = [
  { id: "eu", label: "Europe", flag: "🇪🇺" },
  { id: "gb", label: "Great Britain", flag: "🇬🇧" },
  { id: "us", label: "USA", flag: "🇺🇸" },
  { id: "ca", label: "Canada", flag: "🇨🇦" },
] as const;

export type RegionId = (typeof REGIONS)[number]["id"];

export async function ensureDefaultShops() {
  const shops: Array<{
    id: string; name: string; market: string; regions: string[];
    baseUrl: string; scraperType: string; enabled: boolean;
  }> = [
    // Europe
    { id: "3djake-de", name: "3DJake DE", market: "de", regions: ["eu"], baseUrl: "https://www.3djake.de", scraperType: "playwright-search", enabled: true },
    { id: "bambu-store-eu", name: "Bambu Store EU", market: "de", regions: ["eu", "gb"], baseUrl: "https://eu.store.bambulab.com", scraperType: "playwright-search", enabled: true },
    { id: "prusa-store", name: "Prusa Store", market: "de", regions: ["eu", "gb"], baseUrl: "https://www.prusa3d.com", scraperType: "playwright-search", enabled: true },
    { id: "3dprima", name: "3DPrima", market: "de", regions: ["eu"], baseUrl: "https://www.3dprima.com", scraperType: "sitemap-product", enabled: true },
    { id: "3dmensionals", name: "3Dmensionals", market: "de", regions: ["eu"], baseUrl: "https://www.3dmensionals.de", scraperType: "sitemap-product", enabled: true },
    { id: "formfutura", name: "FormFutura", market: "de", regions: ["eu"], baseUrl: "https://www.formfutura.com", scraperType: "sitemap-product", enabled: true },
    { id: "colorfabb", name: "ColorFabb", market: "de", regions: ["eu"], baseUrl: "https://colorfabb.com", scraperType: "sitemap-product", enabled: true },
    // Great Britain
    { id: "3djake-uk", name: "3DJake UK", market: "gb", regions: ["gb"], baseUrl: "https://www.3djake.co.uk", scraperType: "playwright-search", enabled: false },
    // USA
    { id: "bambu-store-us", name: "Bambu Store US", market: "us", regions: ["us", "ca"], baseUrl: "https://us.store.bambulab.com", scraperType: "playwright-search", enabled: false },
    { id: "amazon-us", name: "Amazon US", market: "us", regions: ["us"], baseUrl: "https://www.amazon.com", scraperType: "manual", enabled: false },
    { id: "matterhackers", name: "MatterHackers", market: "us", regions: ["us", "ca"], baseUrl: "https://www.matterhackers.com", scraperType: "manual", enabled: false },
    { id: "printed-solid", name: "Printed Solid", market: "us", regions: ["us"], baseUrl: "https://www.printedsolid.com", scraperType: "manual", enabled: false },
    { id: "polymaker-us", name: "Polymaker US", market: "us", regions: ["us", "ca"], baseUrl: "https://shop.polymaker.com", scraperType: "shopify-json", enabled: true },
    { id: "proto-pasta-us", name: "Proto-pasta", market: "us", regions: ["us"], baseUrl: "https://www.proto-pasta.com", scraperType: "shopify-json", enabled: true },
    // Europe — direct brand shops
    { id: "extrudr-eu", name: "Extrudr", market: "de", regions: ["eu"], baseUrl: "https://www.extrudr.com", scraperType: "sitemap-product", enabled: true },
    // Canada
    { id: "filaments-ca", name: "Filaments.ca", market: "ca", regions: ["ca"], baseUrl: "https://filaments.ca", scraperType: "manual", enabled: false },
    { id: "3dprintingcanada", name: "3D Printing Canada", market: "ca", regions: ["ca"], baseUrl: "https://3dprintingcanada.com", scraperType: "manual", enabled: false },
  ];

  await Promise.all(
    shops.map((entry) =>
      prisma.shop.upsert({
        where: { id: entry.id },
        create: entry,
        update: { name: entry.name, market: entry.market, regions: entry.regions, baseUrl: entry.baseUrl, enabled: entry.enabled },
      }),
    ),
  );
}

export async function upsertOfferSnapshot(args: {
  shopId: string;
  externalId: string;
  filamentId: string;
  title: string;
  url: string;
  affiliateUrl?: string | null;
  imageUrl?: string | null;
  priceCents: number | null;
  currency: string;
  inStock: boolean;
  packType?: string;
  spoolCount?: number;
  totalWeightG?: number | null;
  sourceConfidence?: number | null;
  lastSeenAt?: Date;
}) {
  const offer = await prisma.offer.upsert({
    where: {
      shopId_externalId: {
        shopId: args.shopId,
        externalId: args.externalId,
      },
    },
    create: {
      slug: slugify(`${args.shopId}-${args.externalId}-${args.title}`).slice(0, 80),
      shopId: args.shopId,
      externalId: args.externalId,
      title: args.title,
      url: args.url,
      affiliateUrl: args.affiliateUrl || args.url,
      imageUrl: args.imageUrl,
      packType: args.packType || "single",
      spoolCount: args.spoolCount || 1,
      totalWeightG: args.totalWeightG,
      lastCheckedAt: new Date(),
      lastSeenAt: args.lastSeenAt || new Date(),
      scrapeStatus: "matched",
      sourceConfidence: args.sourceConfidence ?? 0.5,
      latestPriceCents: args.priceCents,
      latestCurrency: args.currency,
      latestPricePerKgCents: computePricePerKgCents(args.priceCents, args.totalWeightG),
      latestInStock: args.inStock,
      latestScrapedAt: new Date(),
      items: {
        create: {
          filamentId: args.filamentId,
          quantity: args.spoolCount || 1,
          weightG: args.totalWeightG && (args.spoolCount || 1) > 0
            ? Math.round(args.totalWeightG / (args.spoolCount || 1))
            : 1000,
        },
      },
    },
    update: {
      title: args.title,
      url: args.url,
      affiliateUrl: args.affiliateUrl || args.url,
      imageUrl: args.imageUrl,
      packType: args.packType || "single",
      spoolCount: args.spoolCount || 1,
      totalWeightG: args.totalWeightG,
      lastCheckedAt: new Date(),
      lastSeenAt: args.lastSeenAt || new Date(),
      scrapeStatus: "matched",
      sourceConfidence: args.sourceConfidence ?? 0.5,
      latestPriceCents: args.priceCents,
      latestCurrency: args.currency,
      latestPricePerKgCents: computePricePerKgCents(args.priceCents, args.totalWeightG),
      latestInStock: args.inStock,
      latestScrapedAt: new Date(),
    },
  });

  if (args.priceCents != null) {
    await prisma.priceSnapshot.create({
      data: {
        offerId: offer.id,
        priceCents: args.priceCents,
        currency: args.currency,
        pricePerKgCents: computePricePerKgCents(args.priceCents, args.totalWeightG),
        inStock: args.inStock,
      },
    });
  }

  // NOTE: We no longer backfill filament.imageUrl from offer images.
  // Offer images are often for a different color variant (e.g. 3Dmensionals
  // returns a generic product page image that may show Black when the
  // filament is Pink Citrus). Instead, we let the display layer fall back
  // to the color swatch for filaments without a canonical image.

  return offer;
}
