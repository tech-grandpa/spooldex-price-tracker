import { describe, expect, it } from "vitest";
import { buildRobotsPolicy } from "@/lib/robots";

describe("robots policy", () => {
  it("blocks paths disallowed for the wildcard agent", () => {
    const policy = buildRobotsPolicy(`
      User-agent: *
      Disallow: /search
    `, "SpooldexTracker/0.1");

    expect(policy.isAllowed("https://example.com/search?q=pla")).toBe(false);
    expect(policy.isAllowed("https://example.com/products/pla-basic")).toBe(true);
  });

  it("prefers the longest matching allow rule", () => {
    const policy = buildRobotsPolicy(`
      User-agent: *
      Disallow: /collections/
      Allow: /collections/filament
    `, "SpooldexTracker/0.1");

    expect(policy.isAllowed("https://example.com/collections/filament")).toBe(true);
    expect(policy.isAllowed("https://example.com/collections/printers")).toBe(false);
  });
});
