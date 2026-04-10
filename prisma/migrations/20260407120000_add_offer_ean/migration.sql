-- AlterTable
ALTER TABLE "Offer" ADD COLUMN "ean" TEXT;

-- CreateIndex
CREATE INDEX "Offer_ean_idx" ON "Offer"("ean");
