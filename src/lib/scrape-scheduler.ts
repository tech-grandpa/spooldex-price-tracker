export type ScrapeMode = "discover" | "update";

export interface ScrapeIntervals {
  updateMs: number;
  discoveryMs: number;
}

export interface ScrapeRunState {
  update: number;
  discover: number;
}

export function getDueModes(now: number, lastRuns: ScrapeRunState, intervals: ScrapeIntervals): ScrapeMode[] {
  const dueModes: ScrapeMode[] = [];

  if (now - lastRuns.update >= intervals.updateMs) {
    dueModes.push("update");
  }

  if (now - lastRuns.discover >= intervals.discoveryMs) {
    dueModes.push("discover");
  }

  return dueModes;
}

export function getNextCycleSleepMs(now: number, lastRuns: ScrapeRunState, intervals: ScrapeIntervals) {
  const untilUpdate = Math.max(0, intervals.updateMs - (now - lastRuns.update));
  const untilDiscovery = Math.max(0, intervals.discoveryMs - (now - lastRuns.discover));
  return Math.min(untilUpdate, untilDiscovery);
}
