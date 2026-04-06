/**
 * Worker loop — runs shops independently with per-shop timeouts.
 *
 * Two modes:
 * - Update (default daily): re-check existing offers to refresh prices/stock
 * - Discovery (default weekly): search for new offers for unsupported filaments
 *
 * If one shop hangs or crashes, the others continue unaffected.
 */

import { DISCOVERY_INTERVAL_HOURS, SCRAPE_INTERVAL_HOURS } from "@/lib/env";
import { getDueModes, getNextCycleSleepMs, type ScrapeMode, type ScrapeRunState } from "@/lib/scrape-scheduler";
import { runShop, getEnabledShops } from "./scrape";

const UPDATE_INTERVAL_MS = Math.max(1, SCRAPE_INTERVAL_HOURS) * 60 * 60 * 1000;
const DISCOVERY_INTERVAL_MS = Math.max(1, DISCOVERY_INTERVAL_HOURS) * 60 * 60 * 1000;
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

const intervals = {
  updateMs: UPDATE_INTERVAL_MS,
  discoveryMs: DISCOVERY_INTERVAL_MS,
};

const MIN_LOOP_SLEEP_MS = 15 * 60 * 1000;

let lastRuns: ScrapeRunState = {
  update: 0,
  discover: 0,
};

async function runCycle(mode: ScrapeMode) {
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

async function runDueCycles() {
  const now = Date.now();
  const dueModes = getDueModes(now, lastRuns, intervals);
  if (dueModes.length === 0) return;

  for (const mode of dueModes) {
    lastRuns = {
      ...lastRuns,
      [mode]: now,
    };

    try {
      await runCycle(mode);
    } catch (error) {
      console.error(`[Worker] ${mode} cycle error:`, error);
    }
  }
}

async function loop() {
  console.log(
    `[Worker] Started — updates every ~${SCRAPE_INTERVAL_HOURS}h, discovery every ~${DISCOVERY_INTERVAL_HOURS}h`,
  );

  // Random initial delay (0–60 min) so restarts don't always scrape immediately
  const initialDelay = Math.floor(Math.random() * 60 * 60 * 1000);
  console.log(`[Worker] Initial delay: ${Math.round(initialDelay / 60000)}min`);
  await sleep(initialDelay);

  while (true) {
    await runDueCycles();
    const nextSleep = Math.max(MIN_LOOP_SLEEP_MS, getNextCycleSleepMs(Date.now(), lastRuns, intervals));
    console.log(`[Worker] Next cycle check in ~${(nextSleep / 3600000).toFixed(1)}h`);
    await sleep(nextSleep);
  }
}

loop().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
