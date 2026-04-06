import { describe, expect, it } from "vitest";
import { getDueModes, getNextCycleSleepMs } from "@/lib/scrape-scheduler";

describe("scrape scheduler", () => {
  it("runs update and discovery independently", () => {
    const now = 10 * 60 * 60 * 1000;
    const due = getDueModes(now, {
      update: now - 24 * 60 * 60 * 1000,
      discover: now - 7 * 24 * 60 * 60 * 1000,
    }, {
      updateMs: 24 * 60 * 60 * 1000,
      discoveryMs: 7 * 24 * 60 * 60 * 1000,
    });

    expect(due).toEqual(["update", "discover"]);
  });

  it("waits for the sooner of the next update or discovery cycle", () => {
    const now = 5 * 60 * 60 * 1000;
    const sleepMs = getNextCycleSleepMs(now, {
      update: now - 20 * 60 * 60 * 1000,
      discover: now - 2 * 24 * 60 * 60 * 1000,
    }, {
      updateMs: 24 * 60 * 60 * 1000,
      discoveryMs: 7 * 24 * 60 * 60 * 1000,
    });

    expect(sleepMs).toBe(4 * 60 * 60 * 1000);
  });
});
