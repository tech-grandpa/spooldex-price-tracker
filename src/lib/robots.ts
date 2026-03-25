import { MIN_REQUEST_DELAY_MS, TRACKER_USER_AGENT } from "@/lib/env";

type Rule = {
  directive: "allow" | "disallow";
  value: string;
};

type Group = {
  userAgents: string[];
  rules: Rule[];
  crawlDelaySeconds: number | null;
};

type RobotsPolicy = {
  crawlDelayMs: number;
  isAllowed: (target: string | URL) => boolean;
};

const robotsCache = new Map<string, Promise<RobotsPolicy>>();
const originLastRequestAt = new Map<string, number>();

function normalizeUserAgent(value: string) {
  return value.trim().toLowerCase();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesRule(pattern: string, pathWithQuery: string) {
  if (!pattern) return false;
  const regex = new RegExp(
    `^${escapeRegex(pattern)
      .replace(/\\\*/g, ".*")
      .replace(/\\\$/g, "$")}`,
  );
  return regex.test(pathWithQuery);
}

function selectGroups(groups: Group[], userAgent: string) {
  const normalizedAgent = normalizeUserAgent(userAgent);
  const exactMatches = groups.filter((group) =>
    group.userAgents.some((entry) => entry !== "*" && normalizedAgent.includes(entry)),
  );
  if (exactMatches.length > 0) return exactMatches;
  return groups.filter((group) => group.userAgents.includes("*"));
}

export function parseRobotsTxt(contents: string) {
  const groups: Group[] = [];
  let current: Group | null = null;

  for (const rawLine of contents.split("\n")) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) {
      current = null;
      continue;
    }

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();
    if (!value) continue;

    if (key === "user-agent") {
      const normalized = normalizeUserAgent(value);
      const shouldStartNewGroup = current == null || current.rules.length > 0 || current.crawlDelaySeconds != null;
      if (shouldStartNewGroup) {
        current = {
          userAgents: [normalized],
          rules: [],
          crawlDelaySeconds: null,
        };
        groups.push(current);
      } else {
        current!.userAgents.push(normalized);
      }
      continue;
    }

    if (!current) continue;

    if (key === "allow" || key === "disallow") {
      current.rules.push({
        directive: key,
        value,
      });
      continue;
    }

    if (key === "crawl-delay") {
      const parsed = Number(value);
      current.crawlDelaySeconds = Number.isFinite(parsed) ? parsed : null;
    }
  }

  return groups;
}

export function buildRobotsPolicy(contents: string, userAgent = TRACKER_USER_AGENT): RobotsPolicy {
  const groups = selectGroups(parseRobotsTxt(contents), userAgent);
  const crawlDelayMs = Math.max(
    MIN_REQUEST_DELAY_MS,
    ...groups.map((group) => (group.crawlDelaySeconds ?? 0) * 1000),
  );

  return {
    crawlDelayMs,
    isAllowed(target) {
      const url = typeof target === "string" ? new URL(target) : target;
      const pathWithQuery = `${url.pathname}${url.search}`;
      let bestRule: Rule | null = null;
      let bestRuleLength = -1;

      for (const group of groups) {
        for (const rule of group.rules) {
          if (!matchesRule(rule.value, pathWithQuery)) continue;
          const ruleLength = rule.value.length;
          if (
            ruleLength > bestRuleLength ||
            (ruleLength === bestRuleLength && rule.directive === "allow")
          ) {
            bestRule = rule;
            bestRuleLength = ruleLength;
          }
        }
      }

      return bestRule?.directive !== "disallow";
    },
  };
}

async function loadRobotsPolicy(origin: string) {
  const response = await fetch(new URL("/robots.txt", origin), {
    headers: {
      "user-agent": TRACKER_USER_AGENT,
    },
  });

  if (!response.ok) {
    return {
      crawlDelayMs: MIN_REQUEST_DELAY_MS,
      isAllowed: () => true,
    } satisfies RobotsPolicy;
  }

  return buildRobotsPolicy(await response.text());
}

export async function getRobotsPolicy(origin: string) {
  if (!robotsCache.has(origin)) {
    robotsCache.set(
      origin,
      loadRobotsPolicy(origin).catch(() => ({
        crawlDelayMs: MIN_REQUEST_DELAY_MS,
        isAllowed: () => true,
      })),
    );
  }

  return robotsCache.get(origin)!;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForPoliteTurn(targetUrl: string) {
  const url = new URL(targetUrl);
  const policy = await getRobotsPolicy(url.origin);
  if (!policy.isAllowed(url)) {
    return {
      allowed: false,
      crawlDelayMs: policy.crawlDelayMs,
    };
  }

  const now = Date.now();
  const lastRequestAt = originLastRequestAt.get(url.origin);
  const waitMs = lastRequestAt == null ? 0 : Math.max(0, lastRequestAt + policy.crawlDelayMs - now);

  if (waitMs > 0) {
    await sleep(waitMs);
  }

  originLastRequestAt.set(url.origin, Date.now());

  return {
    allowed: true,
    crawlDelayMs: policy.crawlDelayMs,
  };
}
