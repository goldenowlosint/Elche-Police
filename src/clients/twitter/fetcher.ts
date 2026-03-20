import type { Tweet, TwitterSearchResponse } from "./types.js";
import type { SearchQueryConfig } from "../../keywords.js";

const RAPIDAPI_HOST = "twitter154.p.rapidapi.com";
const RESULTS_PER_PAGE = 20;

// 4 req/sec limit → minimum 250ms between requests; use 300ms for safety margin
const MIN_REQUEST_INTERVAL_MS = 300;

let lastRequestTime = 0;

const enforceRateLimit = async (): Promise<void> => {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise<void>((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed),
    );
  }
  lastRequestTime = Date.now();
};

const getApiKey = (): string => {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error("RAPIDAPI_KEY environment variable is not set");
  return key;
};

const buildInitialUrl = (query: string): string => {
  const params = new URLSearchParams({
    query,
    section: "latest",
    limit: String(RESULTS_PER_PAGE),
    language: "es",
  });
  return `https://${RAPIDAPI_HOST}/search/search?${params}`;
};

const buildContinuationUrl = (query: string, token: string): string => {
  const params = new URLSearchParams({
    query,
    section: "latest",
    limit: String(RESULTS_PER_PAGE),
    continuation_token: token,
    language: "es",
  });
  return `https://${RAPIDAPI_HOST}/search/search/continuation?${params}`;
};

const fetchPage = async (url: string): Promise<TwitterSearchResponse> => {
  await enforceRateLimit();

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "x-rapidapi-key": getApiKey(),
      "x-rapidapi-host": RAPIDAPI_HOST,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Twitter API HTTP ${response.status}: ${response.statusText}`,
    );
  }

  return response.json() as Promise<TwitterSearchResponse>;
};

/**
 * Fetches tweets for a single search query, paginating with continuation tokens
 * up to the configured maxPages. Returns deduplicated tweets.
 */
export const searchTweets = async (
  config: SearchQueryConfig,
): Promise<Tweet[]> => {
  const tweets: Tweet[] = [];
  const seenIds = new Set<string>();

  try {
    const initialData = await fetchPage(buildInitialUrl(config.query));

    for (const tweet of initialData.results ?? []) {
      if (!seenIds.has(tweet.tweet_id)) {
        seenIds.add(tweet.tweet_id);
        tweets.push(tweet);
      }
    }

    let continuationToken = initialData.continuation_token;
    let page = 1;

    while (continuationToken && page < config.maxPages) {
      const data = await fetchPage(
        buildContinuationUrl(config.query, continuationToken),
      );

      for (const tweet of data.results ?? []) {
        if (!seenIds.has(tweet.tweet_id)) {
          seenIds.add(tweet.tweet_id);
          tweets.push(tweet);
        }
      }

      continuationToken = data.continuation_token;
      page++;
    }
  } catch (error) {
    console.error(
      `[Twitter Fetcher] Error for query "${config.label}":`,
      error,
    );
  }

  return tweets;
};
