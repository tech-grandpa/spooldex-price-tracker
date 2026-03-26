/**
 * Polymaker Shop Scraper (Shopify JSON API)
 */

import { createShopifyScraper } from "@/lib/scrapers/shopify-shop";

export const polymakerScraper = createShopifyScraper({
  shopId: "polymaker-us",
  baseUrl: "https://shop.polymaker.com",
  currency: "USD",
  brandName: "Polymaker",
  isFilamentProduct: (product) =>
    ["Panchroma Filament", "Polymaker Filament", "Fiberon Filament"].includes(product.product_type),
});
