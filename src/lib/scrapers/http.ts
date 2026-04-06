import { TRACKER_USER_AGENT } from "@/lib/env";
import { waitForPoliteTurn } from "@/lib/robots";
import type { ConditionalRequestHeaders } from "@/lib/scrapers/types";

export type ConditionalTextFetchResult =
  | {
      status: "not-modified";
      etag: string | null;
      lastModifiedHeader: string | null;
    }
  | {
      status: "fetched";
      body: string;
      etag: string | null;
      lastModifiedHeader: string | null;
    };

function buildRequestHeaders(conditional?: ConditionalRequestHeaders) {
  const headers = new Headers({
    "user-agent": TRACKER_USER_AGENT,
  });

  if (conditional?.etag) {
    headers.set("if-none-match", conditional.etag);
  }

  if (conditional?.lastModifiedHeader) {
    headers.set("if-modified-since", conditional.lastModifiedHeader);
  }

  return headers;
}

function readCachingHeaders(response: Response) {
  return {
    etag: response.headers.get("etag"),
    lastModifiedHeader: response.headers.get("last-modified"),
  };
}

export async function fetchTextConditionally(
  url: string,
  conditional?: ConditionalRequestHeaders,
): Promise<ConditionalTextFetchResult | null> {
  const politeTurn = await waitForPoliteTurn(url);
  if (!politeTurn.allowed) {
    console.warn(`[robots] skipping ${url}`);
    return null;
  }

  const response = await fetch(url, {
    headers: buildRequestHeaders(conditional),
    signal: AbortSignal.timeout(30000),
  });

  const cachingHeaders = readCachingHeaders(response);
  if (response.status === 304) {
    return {
      status: "not-modified",
      ...cachingHeaders,
    };
  }

  if (!response.ok) {
    throw new Error(`fetch failed ${response.status} for ${url}`);
  }

  return {
    status: "fetched",
    body: await response.text(),
    ...cachingHeaders,
  };
}
