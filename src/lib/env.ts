export const DEFAULT_MARKET = process.env.DEFAULT_MARKET?.trim() || "de";
export const SCRAPE_INTERVAL_HOURS = Number(process.env.SCRAPE_INTERVAL_HOURS || "2");
export const MIN_REQUEST_DELAY_MS = Number(process.env.MIN_REQUEST_DELAY_MS || "5000");
export const SCRAPE_LIMIT_PER_SHOP = Number(process.env.SCRAPE_LIMIT_PER_SHOP || "100");
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";
export const TRACKER_USER_AGENT =
  process.env.TRACKER_USER_AGENT?.trim() ||
  "SpooldexTracker/0.1 (+https://spooldex-tracker.acgt.dev)";
