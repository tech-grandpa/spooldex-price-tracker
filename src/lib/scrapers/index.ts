import { chromium } from "playwright";
import { TRACKER_USER_AGENT } from "@/lib/env";
import { waitForPoliteTurn } from "@/lib/robots";
import { extractJsonLdOffers } from "@/lib/scrapers/common";
import { selectMatchingCandidate } from "@/lib/scrapers/offer-matching";
import { fetchTextConditionally } from "@/lib/scrapers/http";
import {
  colorFabbScraper,
  formFuturaScraper,
  threeDPrimaScraper,
  threeDmensionalsScraper,
} from "@/lib/scrapers/additional-shops";
import { bambuStoreScraper } from "@/lib/scrapers/bambu-store";
import { prusaStoreScraper } from "@/lib/scrapers/prusa-store";
import { threeDjakeScraper } from "@/lib/scrapers/three-djake";
import { polymakerScraper } from "@/lib/scrapers/polymaker";
import { protoPastaScraper } from "@/lib/scrapers/proto-pasta";
import { extrudrScraper } from "@/lib/scrapers/extrudr";
import type {
  ExistingOfferInput,
  OfferConfirmationResult,
  ScrapedOfferCandidate,
  ScrapeFilamentInput,
  ShopScraper,
} from "@/lib/scrapers/types";

const SCRAPERS: Record<string, ShopScraper> = {
  [threeDjakeScraper.shopId]: threeDjakeScraper,
  [bambuStoreScraper.shopId]: bambuStoreScraper,
  [prusaStoreScraper.shopId]: prusaStoreScraper,
  [threeDPrimaScraper.shopId]: threeDPrimaScraper,
  [threeDmensionalsScraper.shopId]: threeDmensionalsScraper,
  [formFuturaScraper.shopId]: formFuturaScraper,
  [colorFabbScraper.shopId]: colorFabbScraper,
  [polymakerScraper.shopId]: polymakerScraper,
  [protoPastaScraper.shopId]: protoPastaScraper,
  [extrudrScraper.shopId]: extrudrScraper,
};

export function getShopScraper(shopId: string) {
  return SCRAPERS[shopId] ?? null;
}

function defaultQueryForFilament(filament: ScrapeFilamentInput) {
  return [filament.brand, filament.series, filament.material, filament.colorName].filter(Boolean).join(" ");
}

async function scrapeSearchResults(scraper: ShopScraper, query: string) {
  if (!scraper.buildSearchUrl || !scraper.extractOffers) return [];

  const searchUrl = scraper.buildSearchUrl(query);
  const politeTurn = await waitForPoliteTurn(searchUrl);

  if (!politeTurn.allowed) {
    console.warn(`[robots] skipping ${scraper.shopId} ${searchUrl}`);
    return [];
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: TRACKER_USER_AGENT,
  });
  const page = await context.newPage();
  await page.route("**/*", (route) => {
    const type = route.request().resourceType();
    if (type === "image" || type === "media" || type === "font") {
      return route.abort();
    }

    return route.continue();
  });

  try {
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1500);
    const html = await page.content();
    return scraper.extractOffers(html, searchUrl);
  } finally {
    await context.close();
    await browser.close();
  }
}

export async function scrapeShopFilament(shopId: string, filament: ScrapeFilamentInput): Promise<ScrapedOfferCandidate[]> {
  const scraper = getShopScraper(shopId);
  if (!scraper) return [];
  if (scraper.supportsFilament && !scraper.supportsFilament(filament)) return [];
  if (scraper.scrapeFilament) {
    return scraper.scrapeFilament(filament);
  }

  const query = scraper.queryForFilament?.(filament) || defaultQueryForFilament(filament);
  return scrapeSearchResults(scraper, query);
}

export async function confirmShopOffer(
  shopId: string,
  offer: ExistingOfferInput,
): Promise<OfferConfirmationResult> {
  const scraper = getShopScraper(shopId);
  if (!scraper) {
    return {
      status: "unmatched",
      etag: offer.etag,
      lastModifiedHeader: offer.lastModifiedHeader,
    };
  }

  if (scraper.confirmOffer) {
    return scraper.confirmOffer(offer);
  }

  const fetched = await fetchTextConditionally(offer.url, {
    etag: offer.etag,
    lastModifiedHeader: offer.lastModifiedHeader,
  });

  if (!fetched) {
    return {
      status: "unmatched",
      etag: offer.etag,
      lastModifiedHeader: offer.lastModifiedHeader,
    };
  }

  if (fetched.status === "not-modified") {
    return fetched;
  }

  const candidates = scraper.parseOfferPage
    ? scraper.parseOfferPage(fetched.body, offer)
    : extractJsonLdOffers(fetched.body, offer.url);
  const candidate = selectMatchingCandidate(offer, candidates);

  if (!candidate) {
    return {
      status: "unmatched",
      etag: fetched.etag,
      lastModifiedHeader: fetched.lastModifiedHeader,
    };
  }

  return {
    status: "updated",
    candidate,
    etag: fetched.etag,
    lastModifiedHeader: fetched.lastModifiedHeader,
  };
}
