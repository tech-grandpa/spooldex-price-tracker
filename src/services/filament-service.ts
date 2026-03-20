import { eq, ilike, and, desc, sql, type SQL } from "drizzle-orm";
import { db } from "../db/index.js";
import { filament, offer, offerItem, priceSnapshot, shop } from "../db/schema.js";

export async function listFilaments(filters: {
  brand?: string;
  material?: string;
  market?: string;
}) {
  const conditions: SQL[] = [];

  if (filters.brand) {
    conditions.push(ilike(filament.brand, `%${filters.brand}%`));
  }
  if (filters.material) {
    conditions.push(ilike(filament.material, filters.material));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(filament).where(where).orderBy(filament.brand, filament.series);
}

export async function getFilamentById(id: string) {
  const rows = await db.select().from(filament).where(eq(filament.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getOffersForFilament(filamentId: string) {
  // Get offers that contain this filament, with latest price
  const rows = await db
    .select({
      offer: offer,
      offerItem: offerItem,
      shop: shop,
      latestPrice: priceSnapshot,
    })
    .from(offerItem)
    .innerJoin(offer, eq(offerItem.offerId, offer.id))
    .innerJoin(shop, eq(offer.shopId, shop.id))
    .leftJoin(
      priceSnapshot,
      and(
        eq(priceSnapshot.offerId, offer.id),
        eq(
          priceSnapshot.scrapedAt,
          sql`(SELECT MAX(scraped_at) FROM price_snapshot WHERE offer_id = ${offer.id})`,
        ),
      ),
    )
    .where(eq(offerItem.filamentId, filamentId));

  return rows;
}

export async function getPriceHistory(filamentId: string, limit = 90) {
  const rows = await db
    .select({
      priceCents: priceSnapshot.priceCents,
      pricePerKgCents: priceSnapshot.pricePerKgCents,
      currency: priceSnapshot.currency,
      inStock: priceSnapshot.inStock,
      scrapedAt: priceSnapshot.scrapedAt,
      shopId: offer.shopId,
      offerId: priceSnapshot.offerId,
    })
    .from(priceSnapshot)
    .innerJoin(offer, eq(priceSnapshot.offerId, offer.id))
    .innerJoin(offerItem, eq(offerItem.offerId, offer.id))
    .where(eq(offerItem.filamentId, filamentId))
    .orderBy(desc(priceSnapshot.scrapedAt))
    .limit(limit);

  return rows;
}
