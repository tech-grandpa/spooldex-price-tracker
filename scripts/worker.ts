import { SCRAPE_INTERVAL_HOURS } from "@/lib/env";
import { run as runScrape } from "./scrape";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loop() {
  const intervalMs = Math.max(1, SCRAPE_INTERVAL_HOURS) * 60 * 60 * 1000;
  console.log(`worker loop started, interval ${SCRAPE_INTERVAL_HOURS}h`);

  while (true) {
    try {
      await runScrape();
    } catch (error) {
      console.error("worker cycle failed:", error);
    }

    await sleep(intervalMs);
  }
}

loop().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
