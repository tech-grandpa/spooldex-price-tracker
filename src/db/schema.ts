import {
  pgTable,
  uuid,
  text,
  integer,
  real,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ── Filament ────────────────────────────────────────────────────────────────

export const filament = pgTable(
  "filament",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    brand: text("brand").notNull(),
    series: text("series"),
    material: text("material").notNull(),
    colorName: text("color_name"),
    colorHex: text("color_hex"),
    colorHexes: text("color_hexes").array(),
    weightG: integer("weight_g").default(1000),
    diameterMm: real("diameter_mm").default(1.75),
    ean: text("ean"),
    imageUrl: text("image_url"),
    bambuCode: text("bambu_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("filament_brand_idx").on(t.brand),
    index("filament_ean_idx").on(t.ean),
    index("filament_material_idx").on(t.material),
  ],
);

// ── Shop ────────────────────────────────────────────────────────────────────

export const shop = pgTable("shop", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  market: text("market").default("de"),
  baseUrl: text("base_url"),
  affiliateTag: text("affiliate_tag"),
  scraperType: text("scraper_type").notNull(),
  enabled: boolean("enabled").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Offer ───────────────────────────────────────────────────────────────────

export const offer = pgTable(
  "offer",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    shopId: text("shop_id")
      .references(() => shop.id)
      .notNull(),
    externalId: text("external_id"),
    url: text("url").notNull(),
    affiliateUrl: text("affiliate_url"),
    title: text("title"),
    packType: text("pack_type").default("single"),
    spoolCount: integer("spool_count").default(1),
    totalWeightG: integer("total_weight_g"),
    imageUrl: text("image_url"),
    inStock: boolean("in_stock").default(true),
    lastChecked: timestamp("last_checked", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("offer_shop_id_idx").on(t.shopId),
    uniqueIndex("offer_shop_external_idx").on(t.shopId, t.externalId),
  ],
);

// ── Offer Item ──────────────────────────────────────────────────────────────

export const offerItem = pgTable(
  "offer_item",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    offerId: uuid("offer_id")
      .references(() => offer.id, { onDelete: "cascade" })
      .notNull(),
    filamentId: uuid("filament_id").references(() => filament.id),
    quantity: integer("quantity").default(1),
    weightG: integer("weight_g").default(1000),
    colorName: text("color_name"),
    colorHex: text("color_hex"),
  },
  (t) => [
    index("offer_item_offer_id_idx").on(t.offerId),
    index("offer_item_filament_id_idx").on(t.filamentId),
  ],
);

// ── Price Snapshot ──────────────────────────────────────────────────────────

export const priceSnapshot = pgTable(
  "price_snapshot",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    offerId: uuid("offer_id")
      .references(() => offer.id, { onDelete: "cascade" })
      .notNull(),
    priceCents: integer("price_cents").notNull(),
    currency: text("currency").default("EUR"),
    pricePerKgCents: integer("price_per_kg_cents"),
    inStock: boolean("in_stock").default(true),
    scrapedAt: timestamp("scraped_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("price_snapshot_offer_id_idx").on(t.offerId),
    index("price_snapshot_scraped_at_idx").on(t.scrapedAt),
  ],
);
