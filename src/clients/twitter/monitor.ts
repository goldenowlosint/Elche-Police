import * as Sentry from "@sentry/node";
import { TWITTER_SEARCH_QUERIES } from "../../keywords.js";
import { searchTweets } from "./fetcher.js";
import { detectTweetAnomaly, type TweetAnomalyResult } from "./validate.js";
import {
  createScan,
  getExistingAnomalyTweetIds,
  persistTweetAnomalies,
  updateScanTotals,
} from "./storage.js";
import { saveToJson } from "../../lib/save-to-json.js";
import type { Tweet } from "./types.js";

export interface FlaggedTweet {
  tweetId: string;
  text: string;
  userId: string | null;
  username: string | null;
  displayName: string | null;
  followerCount: number | null;
  isVerified: boolean;
  language: string | null;
  favoriteCount: number;
  retweetCount: number;
  replyCount: number;
  views: number;
  mediaUrls: string[];
  expandedUrl: string | null;
  tweetCreatedAt: string;
  severityLevel: number;
  category: string;
  summary: string;
  detectedKeywords: string[];
  location: string | null;
  searchQuery: string | null;
}

interface QueryScanSummary {
  query: string;
  label: string;
  tweetsFound: number;
  anomaliesFound: number;
}

export interface TwitterMonitoringReport {
  scanDate: string;
  scanTimestamp: string;
  totalQueriesRun: number;
  totalTweetsScanned: number;
  anomaliesDetected: number;
  queriesSummary: QueryScanSummary[];
  anomalies: FlaggedTweet[];
}

interface TweetWithContext {
  tweet: Tweet;
  queryLabel: string;
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const AI_CONCURRENCY = 30;

const extractFlaggedTweet = (
  tweet: Tweet,
  analysis: TweetAnomalyResult,
  queryLabel: string,
): FlaggedTweet => ({
  tweetId: tweet.tweet_id,
  text: tweet.text,
  userId: tweet.user?.user_id ?? null,
  username: tweet.user?.username ?? null,
  displayName: tweet.user?.name ?? null,
  followerCount: tweet.user?.follower_count ?? null,
  isVerified:
    tweet.user?.is_verified || tweet.user?.is_blue_verified || false,
  language: tweet.language ?? null,
  favoriteCount: tweet.favorite_count ?? 0,
  retweetCount: tweet.retweet_count ?? 0,
  replyCount: tweet.reply_count ?? 0,
  views: tweet.views ?? 0,
  mediaUrls: tweet.media_url ?? [],
  expandedUrl: tweet.expanded_url ?? null,
  tweetCreatedAt: tweet.creation_date,
  severityLevel: analysis.severityLevel ?? 0,
  category: analysis.category ?? "other_concern",
  summary: analysis.summary ?? "",
  detectedKeywords: analysis.detectedKeywords ?? [],
  location: analysis.location ?? null,
  searchQuery: queryLabel,
});

/**
 * Strips tweet to only the fields the AI needs for classification,
 * keeping token usage low and analysis focused.
 */
const buildAIPayload = (tweet: Tweet): string =>
  JSON.stringify({
    text: tweet.text,
    user: {
      username: tweet.user?.username,
      name: tweet.user?.name,
      location: tweet.user?.location,
      description: tweet.user?.description,
    },
    language: tweet.language,
    media_url: tweet.media_url,
    expanded_url: tweet.expanded_url,
    creation_date: tweet.creation_date,
    retweet: tweet.retweet,
  });

/**
 * Sends tweets to AI for anomaly detection in batches.
 * Returns only the tweets flagged as anomalies.
 */
const analyzeTweetsWithAI = async (
  items: TweetWithContext[],
): Promise<FlaggedTweet[]> => {
  const flagged: FlaggedTweet[] = [];

  for (let i = 0; i < items.length; i += AI_CONCURRENCY) {
    const batch = items.slice(i, i + AI_CONCURRENCY);

    console.log(
      `[Twitter Monitor]   → AI batch ${Math.floor(i / AI_CONCURRENCY) + 1}/${Math.ceil(items.length / AI_CONCURRENCY)} ` +
        `(${batch.length} tweets)`,
    );

    const results = await Promise.allSettled(
      batch.map(async ({ tweet, queryLabel }) => {
        const analysis = await detectTweetAnomaly(
          buildAIPayload(tweet),
          queryLabel,
        );
        if (analysis?.isAnomaly) {
          return extractFlaggedTweet(tweet, analysis, queryLabel);
        }
        return null;
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        flagged.push(result.value);
      }
    }

    if (i + AI_CONCURRENCY < items.length) {
      await delay(300);
    }
  }

  return flagged;
};

/**
 * Full Twitter monitoring pipeline:
 * 1. Fetch tweets from all configured search queries (rate-limited)
 * 2. Deduplicate across queries
 * 3. Skip tweets already stored as anomalies
 * 4. AI anomaly detection on remaining tweets
 * 5. Persist new anomalies to database
 * 6. Save JSON report
 */
export const runTwitterMonitoring = async (): Promise<void> => {
  const startTime = Date.now();
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toISOString().replace(/[:.]/g, "-");

  console.log(`[Twitter Monitor] Starting scan at ${now.toISOString()}`);

  let scan: { id: string };
  try {
    scan = await createScan(dateStr, now.toISOString());
  } catch (error) {
    console.error("[Twitter Monitor] Failed to create scan record:", error);
    Sentry.captureException(error, {
      tags: { module: "twitterMonitor", phase: "createScan" },
    });
    return;
  }

  // --- Phase 1: Fetch tweets from all search queries ---
  const allTweets = new Map<string, TweetWithContext>();
  const queriesSummary: QueryScanSummary[] = [];

  for (const queryConfig of TWITTER_SEARCH_QUERIES) {
    try {
      console.log(
        `[Twitter Monitor] Searching: "${queryConfig.label}" → ${queryConfig.query}`,
      );

      const tweets = await searchTweets(queryConfig);
      let newCount = 0;

      for (const tweet of tweets) {
        if (!allTweets.has(tweet.tweet_id)) {
          allTweets.set(tweet.tweet_id, {
            tweet,
            queryLabel: queryConfig.label,
          });
          newCount++;
        }
      }

      console.log(
        `[Twitter Monitor]   ${queryConfig.label}: ${tweets.length} fetched, ${newCount} unique new`,
      );

      queriesSummary.push({
        query: queryConfig.query,
        label: queryConfig.label,
        tweetsFound: tweets.length,
        anomaliesFound: 0,
      });
    } catch (error) {
      console.error(
        `[Twitter Monitor] Error in query "${queryConfig.label}":`,
        error,
      );
      Sentry.captureException(error, {
        tags: { module: "twitterMonitor", query: queryConfig.label },
      });
    }
  }

  const uniqueTweets = Array.from(allTweets.values());
  console.log(
    `[Twitter Monitor] Total unique tweets collected: ${uniqueTweets.length}`,
  );

  // --- Phase 2: Filter out already-known anomalies to save AI calls ---
  let tweetsToAnalyze: TweetWithContext[];
  try {
    const existingIds = await getExistingAnomalyTweetIds(
      uniqueTweets.map((t) => t.tweet.tweet_id),
    );
    tweetsToAnalyze = uniqueTweets.filter(
      (t) => !existingIds.has(t.tweet.tweet_id),
    );
    if (existingIds.size > 0) {
      console.log(
        `[Twitter Monitor] Skipping ${existingIds.size} already-known anomalies`,
      );
    }
  } catch {
    tweetsToAnalyze = uniqueTweets;
  }

  console.log(
    `[Twitter Monitor] Sending ${tweetsToAnalyze.length} tweets to AI for analysis`,
  );

  // --- Phase 3: AI anomaly detection ---
  const allAnomalies: FlaggedTweet[] = [];

  if (tweetsToAnalyze.length > 0) {
    const flagged = await analyzeTweetsWithAI(tweetsToAnalyze);
    allAnomalies.push(...flagged);
  }

  console.log(
    `[Twitter Monitor] AI analysis complete: ${allAnomalies.length} anomalies detected`,
  );

  // --- Phase 4: Persist anomalies to database ---
  if (allAnomalies.length > 0) {
    try {
      const { newAnomalies, updatedAnomalies } = await persistTweetAnomalies(
        allAnomalies,
        scan.id,
      );
      console.log(
        `[Twitter Monitor] DB persisted — new: ${newAnomalies}, updated: ${updatedAnomalies}`,
      );
    } catch (error) {
      console.error("[Twitter Monitor] Failed to persist anomalies:", error);
      Sentry.captureException(error, {
        tags: { module: "twitterMonitor", phase: "persist" },
      });
    }
  }

  // Update scan totals
  try {
    await updateScanTotals(scan.id, {
      totalQueriesRun: queriesSummary.length,
      totalTweetsScanned: uniqueTweets.length,
      anomaliesDetected: allAnomalies.length,
      queriesSummary,
    });
  } catch (error) {
    console.error("[Twitter Monitor] Failed to update scan totals:", error);
    Sentry.captureException(error, {
      tags: { module: "twitterMonitor", phase: "updateScanTotals" },
    });
  }

  // --- Phase 5: Save JSON report ---
  if (allAnomalies.length > 0) {
    const report: TwitterMonitoringReport = {
      scanDate: dateStr,
      scanTimestamp: now.toISOString(),
      totalQueriesRun: queriesSummary.length,
      totalTweetsScanned: uniqueTweets.length,
      anomaliesDetected: allAnomalies.length,
      queriesSummary,
      anomalies: allAnomalies,
    };
    const filename = `twitter-anomalies-${timeStr}`;
    await saveToJson(filename, report);
    console.log(`[Twitter Monitor] Report saved: ${filename}.json`);
  } else {
    console.log("[Twitter Monitor] No anomalies detected in this scan");
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[Twitter Monitor] Scan complete in ${elapsed}s — ` +
      `${allAnomalies.length} anomalies from ${uniqueTweets.length} tweets ` +
      `across ${queriesSummary.length} queries`,
  );
};
