import cron from "node-cron";
import { getScraper } from "./scrapers/index.js";

export function startScheduler() {
  // Scrape Amazon DE every 12 hours (at 06:00 and 18:00 UTC)
  cron.schedule("0 6,18 * * *", async () => {
    console.log(`[scheduler] Running Amazon DE scrape at ${new Date().toISOString()}`);

    const scraper = getScraper("amazon-de");
    if (!scraper) {
      console.warn("[scheduler] No Amazon scraper configured, skipping");
      return;
    }

    // TODO: Implement actual scrape logic
    // 1. Get list of filaments to track
    // 2. Search Amazon for each
    // 3. Upsert offers
    // 4. Insert price snapshots
    console.log("[scheduler] Would scrape Amazon DE now");
  });

  console.log("⏰ Scheduler started — Amazon DE scrape at 06:00 and 18:00 UTC");
}
