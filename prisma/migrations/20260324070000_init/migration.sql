-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Filament" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "series" TEXT,
    "material" TEXT NOT NULL,
    "colorName" TEXT,
    "colorHex" TEXT,
    "colorHexes" TEXT[],
    "weightG" INTEGER NOT NULL DEFAULT 1000,
    "diameterMm" DOUBLE PRECISION NOT NULL DEFAULT 1.75,
    "ean" TEXT,
    "imageUrl" TEXT,
    "bambuCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Filament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "market" TEXT NOT NULL DEFAULT 'de',
    "baseUrl" TEXT,
    "scraperType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "externalId" TEXT,
    "url" TEXT NOT NULL,
    "affiliateUrl" TEXT,
    "title" TEXT NOT NULL,
    "packType" TEXT NOT NULL DEFAULT 'single',
    "spoolCount" INTEGER NOT NULL DEFAULT 1,
    "totalWeightG" INTEGER,
    "imageUrl" TEXT,
    "lastCheckedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "scrapeStatus" TEXT NOT NULL DEFAULT 'pending',
    "sourceConfidence" DOUBLE PRECISION,
    "latestPriceCents" INTEGER,
    "latestCurrency" TEXT,
    "latestPricePerKgCents" INTEGER,
    "latestInStock" BOOLEAN,
    "latestScrapedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferItem" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "filamentId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "weightG" INTEGER NOT NULL DEFAULT 1000,
    "colorName" TEXT,
    "colorHex" TEXT,

    CONSTRAINT "OfferItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceSnapshot" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "pricePerKgCents" INTEGER,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Filament_slug_key" ON "Filament"("slug");

-- CreateIndex
CREATE INDEX "Filament_brand_idx" ON "Filament"("brand");

-- CreateIndex
CREATE INDEX "Filament_material_idx" ON "Filament"("material");

-- CreateIndex
CREATE INDEX "Filament_ean_idx" ON "Filament"("ean");

-- CreateIndex
CREATE INDEX "Filament_bambuCode_idx" ON "Filament"("bambuCode");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_slug_key" ON "Offer"("slug");

-- CreateIndex
CREATE INDEX "Offer_shopId_idx" ON "Offer"("shopId");

-- CreateIndex
CREATE INDEX "Offer_latestPriceCents_idx" ON "Offer"("latestPriceCents");

-- CreateIndex
CREATE INDEX "Offer_latestScrapedAt_idx" ON "Offer"("latestScrapedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Offer_shopId_externalId_key" ON "Offer"("shopId", "externalId");

-- CreateIndex
CREATE INDEX "OfferItem_offerId_idx" ON "OfferItem"("offerId");

-- CreateIndex
CREATE INDEX "OfferItem_filamentId_idx" ON "OfferItem"("filamentId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_offerId_idx" ON "PriceSnapshot"("offerId");

-- CreateIndex
CREATE INDEX "PriceSnapshot_scrapedAt_idx" ON "PriceSnapshot"("scrapedAt");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferItem" ADD CONSTRAINT "OfferItem_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferItem" ADD CONSTRAINT "OfferItem_filamentId_fkey" FOREIGN KEY ("filamentId") REFERENCES "Filament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceSnapshot" ADD CONSTRAINT "PriceSnapshot_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "Offer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

