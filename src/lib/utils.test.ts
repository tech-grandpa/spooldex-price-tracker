import { describe, expect, it } from "vitest";
import { computePricePerKgCents, formatFreshness, normalizeComparable, slugify } from "@/lib/utils";

describe("utils", () => {
  it("slugifies consistently", () => {
    expect(slugify("Bambu Lab PLA Basic Jade White 1000")).toBe("bambu-lab-pla-basic-jade-white-1000");
  });

  it("normalizes comparable strings", () => {
    expect(normalizeComparable("PLA+ / White")).toBe("pla white");
  });

  it("computes cents per kg", () => {
    expect(computePricePerKgCents(2499, 1000)).toBe(2499);
    expect(computePricePerKgCents(9999, 5000)).toBe(2000);
  });

  it("formats freshness with minute granularity", () => {
    expect(formatFreshness(new Date(Date.now() - 30 * 1000))).toBe("just now");
    expect(formatFreshness(new Date(Date.now() - 5 * 60 * 1000))).toBe("5m ago");
  });
});
