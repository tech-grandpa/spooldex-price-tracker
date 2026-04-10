/**
 * One-time EAN backfill script.
 *
 * Re-fetches product pages for existing offers that lack an EAN,
 * extracts GTIN from JSON-LD structured data, and updates both
 * Offer.ean and Filament.ean.
 *
 * Usage: npm run ean:backfill [-- --limit=100 --shop=colorfabb-eu]
 */

import { pathToFileURL } from "node:url";
import { load } from "cheerio";
import { prisma } from "@/lib/prisma";
import { TRACKER_USER_AGENT } from "@/lib/env";
import { waitForPoliteTurn } from "@/lib/robots";

function extractGtinFromHtml(html: string): string | null {
  const $ = load(html);
  let gtin: string | null = null;

  $('script[type="application/ld+json"]').each((_, element) => {
    if (gtin) return;
    const raw = $(element).text().trim();
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      const nodes = Array.isArray(parsed) ? parsed : [parsed];

      for (const node of nodes) {
        const candidate = node.gtin13 || node.gtin12 || node.gtin || node.gtin14;
        if (candidate && typeof candidate === "string" && /^\d{8,14}$/.test(candidate.trim())) {
          gtin = candidate.trim();
          return;
        }

        // Check variants (ProductGroup)
        if (node.hasVariant && Array.isArray(node.hasVariant)) {
          for (const variant of node.hasVariant) {
            const variantGtin = variant.gtin13 || variant.gtin12 || variant.gtin || variant.gtin14;
            if (variantGtin && typeof variantGtin === "string" && /^\d{8,14}$/.test(variantGtin.trim())) {
              gtin = variantGtin.trim();
              return;
            }
          }
        }
      }
    } catch {
      // ignore malformed JSON-LD
    }
  });

  return gtin;
}

async function fetchText(url: string): Promise<string | null> {
  const turn = await waitForPoliteTurn(url);
  if (!turn.allowed) return null;

  try {
    const response = await fetch(url, {
      headers: { "user-agent": TRACKER_USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;
    return response.text();
  } catch {
    return null;
  }
}

async function run() {
  const args = new Map(
    process.argv.slice(2).map((entry) => {
      const [key, value] = entry.replace(/^--/, "").split("=");
      return [key, value ?? "true"];
    }),
  );

  const limit = parseInt(args.get("limit") || "200", 10);
  const shopFilter = args.get("shop") || null;

  const where: Record<string, unknown> = { ean: null };
  if (shopFilter) where.shopId = shopFilter;

  const offers = await prisma.offer.findMany({
    where,
    select: {
      id: true,
      url: true,
      shopId: true,
      items: { select: { filamentId: true }, take: 1 },
    },
    take: limit,
    orderBy: { createdAt: "desc" },
  });

  console.log(`Found ${offers.length} offers without EAN (limit ${limit})`);
  let updated = 0;
  let filamentBackfilled = 0;

  for (const offer of offers) {
    const html = await fetchText(offer.url);
    if (!html) continue;

    const ean = extractGtinFromHtml(html);
    if (!ean) continue;

    await prisma.offer.update({
      where: { id: offer.id },
      data: { ean },
    });
    updated++;

    // Backfill filament EAN
    if (offer.items[0]) {
      const result = await prisma.filament.updateMany({
        where: { id: offer.items[0].filamentId, ean: null },
        data: { ean },
      });
      if (result.count > 0) filamentBackfilled++;
    }

    if (updated % 10 === 0) {
      console.log(`Progress: ${updated} offers updated, ${filamentBackfilled} filaments backfilled`);
    }
  }

  console.log(`Done: ${updated} offers updated, ${filamentBackfilled} filaments backfilled`);
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
