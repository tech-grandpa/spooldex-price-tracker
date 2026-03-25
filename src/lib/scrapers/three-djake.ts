import { load } from "cheerio";
import { buildCandidate, rankCandidates } from "@/lib/scrapers/common";
import { slugify } from "@/lib/utils";
import type { ShopScraper } from "@/lib/scrapers/types";

const PRIORITY_BRANDS = new Set([
  "polymaker",
  "esun",
  "elegoo",
  "overture",
  "hatchbox",
  "sunlu",
]);

function materialPriority(material: string) {
  const normalized = material.toUpperCase();
  if (["PLA", "PETG", "ABS", "ASA", "TPU"].includes(normalized)) return 25;
  if (normalized.includes("CF") || normalized.includes("GF")) return 6;
  return 10;
}

export const threeDjakeScraper: ShopScraper = {
  shopId: "3djake-de",
  queryForFilament(filament) {
    return [filament.brand, filament.series, filament.colorName, filament.weightG ? `${filament.weightG}g` : null]
      .filter(Boolean)
      .join(" ");
  },
  supportsFilament(filament) {
    return PRIORITY_BRANDS.has(filament.brand.toLowerCase());
  },
  scoreFilament(filament) {
    const normalizedBrand = filament.brand.toLowerCase();
    const brandScore = PRIORITY_BRANDS.has(normalizedBrand) ? 100 : 10;
    const weightScore = filament.weightG === 1000 ? 8 : filament.weightG >= 750 && filament.weightG <= 1250 ? 4 : 0;
    return brandScore + materialPriority(filament.material) + weightScore;
  },
  buildSearchUrl(query: string) {
    return `https://www.3djake.de/search?keyword=${encodeURIComponent(query)}`;
  },
  extractOffers(html: string, pageUrl: string) {
    const query = new URL(pageUrl).searchParams.get("keyword") || "";
    const $ = load(html);
    const offers = $("li.productCard")
      .map((_, element) => {
        const card = $(element);
        const href = card.find("a.productCard__link").attr("href") || card.find("a.productCard__img__link").attr("href");
        if (!href) return null;

        const url = new URL(href, pageUrl).toString();
        const title = card.find("a.productCard__link").text();
        const imageUrl = card.find("img").attr("src") || null;
        const priceText = card.find(".productCard__price > span").first().text();
        const stockText = card.find(".productCard__stock").text();
        const dataId = card.attr("data-json")
          ? JSON.parse(card.attr("data-json") || "{}").id as string | undefined
          : undefined;

        return buildCandidate({
          externalId: dataId || slugify(new URL(url).pathname),
          title,
          url,
          imageUrl,
          priceText,
          stockText,
          sourceConfidence: 0.78,
        });
      })
      .get()
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    return rankCandidates(query, offers);
  },
};
