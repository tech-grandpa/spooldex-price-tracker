import { eq, ilike, or, type SQL } from "drizzle-orm";
import { db } from "../db/index.js";
import { offer, offerItem, filament, shop } from "../db/schema.js";

export async function searchOffers(filters: { ean?: string; q?: string }) {
  if (filters.ean) {
    // Search by EAN — find filaments with this EAN, then their offers
    const rows = await db
      .select({ offer, offerItem, filament, shop })
      .from(offerItem)
      .innerJoin(offer, eq(offerItem.offerId, offer.id))
      .innerJoin(shop, eq(offer.shopId, shop.id))
      .leftJoin(filament, eq(offerItem.filamentId, filament.id))
      .where(eq(filament.ean, filters.ean));
    return rows;
  }

  if (filters.q) {
    const rows = await db
      .select({ offer, offerItem, filament, shop })
      .from(offer)
      .innerJoin(shop, eq(offer.shopId, shop.id))
      .leftJoin(offerItem, eq(offerItem.offerId, offer.id))
      .leftJoin(filament, eq(offerItem.filamentId, filament.id))
      .where(
        or(
          ilike(offer.title, `%${filters.q}%`),
          ilike(filament.brand, `%${filters.q}%`),
          ilike(filament.series, `%${filters.q}%`),
        ),
      );
    return rows;
  }

  // Return recent offers
  return db
    .select({ offer, shop })
    .from(offer)
    .innerJoin(shop, eq(offer.shopId, shop.id))
    .limit(50);
}

export async function getMarkets() {
  const rows = await db
    .selectDistinct({ market: shop.market })
    .from(shop)
    .where(eq(shop.enabled, true));

  return rows.map((r) => r.market).filter(Boolean);
}
