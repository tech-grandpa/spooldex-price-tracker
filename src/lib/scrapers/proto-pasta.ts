/**
 * Proto-pasta Scraper (Shopify JSON API)
 */

import { createShopifyScraper } from "@/lib/scrapers/shopify-shop";

export const protoPastaScraper = createShopifyScraper({
  shopId: "proto-pasta-us",
  baseUrl: "https://www.proto-pasta.com",
  currency: "USD",
  brandName: "Protopasta",
  isFilamentProduct: (product) =>
    product.product_type === "3D Printer Filament" || product.product_type === "",
  supportsFilament: (filament) => {
    const brand = filament.brand.toLowerCase();
    return brand === "protopasta" || brand === "proto-pasta";
  },
});
