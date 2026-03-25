import { createJsonLdProductParser, createSitemapProductScraper, extractOdooVariantOffers } from "@/lib/scrapers/sitemap-shop";
import type { ScrapeFilamentInput } from "@/lib/scrapers/types";

const MULTI_BRAND_RETAILER_BRANDS = new Set([
  "bambu lab",
  "elegoo",
  "esun",
  "fillamentum",
  "formfutura",
  "hatchbox",
  "overture",
  "polymaker",
  "prusament",
  "sunlu",
]);

function supportsRetailerFilament(filament: ScrapeFilamentInput) {
  return MULTI_BRAND_RETAILER_BRANDS.has(filament.brand.toLowerCase());
}

function scoreRetailerFilament(filament: ScrapeFilamentInput) {
  const brandScore = supportsRetailerFilament(filament) ? 80 : 0;
  const weightScore = filament.weightG === 1000 ? 20 : filament.weightG >= 750 && filament.weightG <= 1250 ? 10 : 0;
  const materialScore = ["PLA", "PETG", "ABS", "ASA", "TPU"].includes(filament.material.toUpperCase()) ? 12 : 4;
  return brandScore + weightScore + materialScore;
}

function supportsBrand(brand: string) {
  return (filament: ScrapeFilamentInput) => filament.brand.toLowerCase() === brand;
}

function scoreDirectBrandFilament(filament: ScrapeFilamentInput) {
  const weightScore = filament.weightG === 1000 ? 20 : filament.weightG >= 700 && filament.weightG <= 1250 ? 10 : 0;
  return 100 + weightScore;
}

export const threeDPrimaScraper = createSitemapProductScraper({
  shopId: "3dprima",
  sitemapUrls: [
    "https://www.3dprima.com/sitemap/Sitemap_item.xml",
    "https://www.3dprima.com/sitemap/Sitemap_item_2.xml",
    "https://www.3dprima.com/sitemap/Sitemap_item_3.xml",
  ],
  productUrlFilter(url) {
    const pathname = new URL(url).pathname.toLowerCase();
    return !pathname.includes("/accessories/") && !pathname.includes("/3d-printers/") && !pathname.includes("/software/");
  },
  supportsFilament: supportsRetailerFilament,
  scoreFilament: scoreRetailerFilament,
  parseProductPage: createJsonLdProductParser(0.73),
});

export const threeDmensionalsScraper = createSitemapProductScraper({
  shopId: "3dmensionals",
  sitemapUrls: ["https://www.3dmensionals.de/sitemap.xml"],
  productUrlFilter(url) {
    const pathname = new URL(url).pathname.toLowerCase();
    return !pathname.includes("/beratung") && !pathname.includes("/event") && !pathname.includes("/webinar");
  },
  supportsFilament: supportsRetailerFilament,
  scoreFilament: scoreRetailerFilament,
  parseProductPage: extractOdooVariantOffers,
});

export const formFuturaScraper = createSitemapProductScraper({
  shopId: "formfutura",
  sitemapUrls: ["https://www.formfutura.com/sitemap.xml"],
  productUrlFilter(url) {
    const pathname = new URL(url).pathname.toLowerCase();
    return !pathname.startsWith("/blog") && !pathname.startsWith("/contact") && !pathname.startsWith("/shop");
  },
  supportsFilament: supportsBrand("formfutura"),
  scoreFilament: scoreDirectBrandFilament,
  parseProductPage: extractOdooVariantOffers,
});

export const colorFabbScraper = createSitemapProductScraper({
  shopId: "colorfabb",
  sitemapUrls: ["https://colorfabb.com/media/colorfabb_com/products.xml"],
  supportsFilament: supportsBrand("colorfabb"),
  scoreFilament: scoreDirectBrandFilament,
  parseProductPage: createJsonLdProductParser(0.75),
});
