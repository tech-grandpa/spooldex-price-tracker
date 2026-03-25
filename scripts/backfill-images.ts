import { pathToFileURL } from "node:url";
import { prisma } from "@/lib/prisma";
import { cacheRemoteImageToR2 } from "@/lib/r2";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isCdnUrl(url: string | null | undefined, publicBaseUrl: string | null) {
  if (!url || !publicBaseUrl) return false;
  return url.startsWith(publicBaseUrl);
}

async function backfillFilamentImages(limit: number, publicBaseUrl: string | null) {
  const filaments = await prisma.filament.findMany({
    take: limit,
    orderBy: { updatedAt: "desc" },
    include: {
      offerItems: {
        include: {
          offer: true,
        },
        orderBy: {
          offer: {
            latestScrapedAt: "desc",
          },
        },
      },
    },
  });

  let updated = 0;
  for (const filament of filaments) {
    const sourceUrl =
      filament.imageUrl ||
      filament.offerItems.find((item) => item.offer.imageUrl)?.offer.imageUrl ||
      null;

    if (!sourceUrl || isCdnUrl(sourceUrl, publicBaseUrl)) continue;

    try {
      const cachedUrl = await cacheRemoteImageToR2(sourceUrl, `filaments/${filament.slug}.jpg`);
      if (!cachedUrl || cachedUrl === sourceUrl) continue;

      await prisma.filament.update({
        where: { id: filament.id },
        data: { imageUrl: cachedUrl },
      });
      updated += 1;
      await sleep(250);
    } catch (error) {
      console.warn(`Skipping filament image ${filament.slug}:`, error);
    }
  }

  return updated;
}

async function backfillOfferImages(limit: number, publicBaseUrl: string | null) {
  const offers = await prisma.offer.findMany({
    where: { imageUrl: { not: null } },
    take: limit,
    orderBy: { updatedAt: "desc" },
  });

  let updated = 0;
  for (const offer of offers) {
    if (!offer.imageUrl || isCdnUrl(offer.imageUrl, publicBaseUrl)) continue;

    const key = `offers/${offer.shopId}/${offer.externalId || offer.id}.jpg`;
    try {
      const cachedUrl = await cacheRemoteImageToR2(offer.imageUrl, key);
      if (!cachedUrl || cachedUrl === offer.imageUrl) continue;

      await prisma.offer.update({
        where: { id: offer.id },
        data: { imageUrl: cachedUrl },
      });
      updated += 1;
      await sleep(250);
    } catch (error) {
      console.warn(`Skipping offer image ${offer.id}:`, error);
    }
  }

  return updated;
}

async function main() {
  const args = new Map(
    process.argv.slice(2).map((entry) => {
      const [key, value] = entry.replace(/^--/, "").split("=");
      return [key, value ?? "true"];
    }),
  );

  const limit = Number(args.get("limit") || "300");
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, "") || null;

  const filamentUpdates = await backfillFilamentImages(limit, publicBaseUrl);
  const offerUpdates = await backfillOfferImages(limit, publicBaseUrl);

  console.log(`Backfilled ${filamentUpdates} filament images and ${offerUpdates} offer images.`);
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
