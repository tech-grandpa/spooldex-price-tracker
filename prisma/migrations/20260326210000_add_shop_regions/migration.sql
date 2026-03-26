-- Add regions array to Shop
ALTER TABLE "Shop" ADD COLUMN "regions" TEXT[] DEFAULT ARRAY['eu']::TEXT[];

-- Set regions for existing shops
UPDATE "Shop" SET "regions" = ARRAY['eu'] WHERE id IN ('3djake-de', '3dmensionals', 'formfutura', 'colorfabb', '3dprima');
UPDATE "Shop" SET "regions" = ARRAY['eu', 'gb'] WHERE id IN ('bambu-store-eu', 'prusa-store');
