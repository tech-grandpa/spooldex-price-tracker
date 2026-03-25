import { load } from "cheerio";
import { buildCandidate, collapseWhitespace, rankCandidates } from "@/lib/scrapers/common";
import { slugify } from "@/lib/utils";
import type { ShopScraper } from "@/lib/scrapers/types";

export const prusaStoreScraper: ShopScraper = {
  shopId: "prusa-store",
  queryForFilament(filament) {
    return [filament.brand, filament.material, filament.colorName].filter(Boolean).join(" ");
  },
  supportsFilament(filament) {
    return /prusament/i.test(filament.brand);
  },
  scoreFilament(filament) {
    const weightDelta = Math.abs((filament.weightG || 1000) - 1000);
    const weightScore = Math.max(0, 20 - Math.round(weightDelta / 100));
    return 100 + weightScore;
  },
  buildSearchUrl(query: string) {
    return `https://www.prusa3d.com/search/?q=${encodeURIComponent(query)}`;
  },
  extractOffers(html: string, pageUrl: string) {
    const query = new URL(pageUrl).searchParams.get("q") || "";
    const $ = load(html);
    const seen = new Set<string>();
    const offers = $('a[href*="/product/"]')
      .map((_, element) => {
        const anchor = $(element);
        const href = anchor.attr("href");
        if (!href) return null;

        const url = new URL(href, pageUrl).toString();
        if (seen.has(url)) return null;
        seen.add(url);

        const title = anchor.find("img").attr("alt") || anchor.text();
        const text = collapseWhitespace(anchor.text());
        const priceText = text.match(/€\s*\d+(?:\.\d{2})?/)?.[0] || null;
        const stockText = text
          .replace(collapseWhitespace(title), "")
          .replace(priceText || "", "")
          .trim();

        return buildCandidate({
          externalId: slugify(new URL(url).pathname),
          title,
          url,
          imageUrl: anchor.find("img").attr("src")
            ? new URL(anchor.find("img").attr("src") || "", pageUrl).toString()
            : null,
          priceText,
          stockText,
          sourceConfidence: 0.76,
        });
      })
      .get()
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

    return rankCandidates(query, offers);
  },
};
