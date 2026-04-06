-- Store cache validators for conditional product-page fetches
ALTER TABLE "Offer" ADD COLUMN "etag" TEXT;
ALTER TABLE "Offer" ADD COLUMN "lastModifiedHeader" TEXT;
