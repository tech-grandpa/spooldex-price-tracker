/**
 * Worker loop — runs shops independently with per-shop timeouts.
 *
 * Two modes:
 * - Discovery (every 2h): scrape never-matched filaments to find new offers
 * - Update (once/day): re-scrape existing offers to refresh prices/stock
 *
 * If one shop hangs or crashes, the others continue unaffected.
 */

import { SCRAPE_INTERVAL_HOURS } from "@/lib/env";
import { runShop, getEnabledShops } from "./scrape";

const DISCOVERY_INTERVAL_MS = Math.max(1, SCRAPE_INTERVAL_HOURS) * 60 * 60 * 1000;
const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const PER_SHOP_TIMEOUT_MS = 20 * 60 * 1000; // 20 min max per shop

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => {
      console.error(`[Worker] ${label} timed out after ${Math.round(ms / 60000)}min — skipping`);
      resolve(null);
    }, ms)),
  ]);
}

let lastUpdateRun = 0;

async function runCycle() {
  const now = Date.now();
  const isUpdateCycle = now - lastUpdateRun >= UPDATE_INTERVAL_MS;
  const mode = isUpdateCycle ? "update" : "discover";

  if (isUpdateCycle) lastUpdateRun = now;

  const shops = await getEnabledShops();
  console.log(`\n[Worker] Starting ${mode} cycle — ${shops.length} shops`);

  for (const shop of shops) {
    const startTime = Date.now();
    try {
      await withTimeout(
        runShop(shop.id, shop.name, mode),
        PER_SHOP_TIMEOUT_MS,
        `${shop.name} (${mode})`,
      );
    } catch (error) {
      console.error(`[Worker] ${shop.name} crashed:`, error instanceof Error ? error.message : error);
    }
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.log(`[Worker] ${shop.name} done in ${elapsed}s`);
  }

  console.log(`[Worker] ${mode} cycle complete`);
}

async function loop() {
  console.log(`[Worker] Started — discovery every ${SCRAPE_INTERVAL_HOURS}h, updates every 24h`);
  // First run is always a discovery cycle
  lastUpdateRun = Date.now();

  while (true) {
    try {
      await runCycle();
    } catch (error) {
      console.error("[Worker] Cycle error:", error);
    }
    await sleep(DISCOVERY_INTERVAL_MS);
  }
}

loop().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
