import prisma from "../../lib/prisma.js";
import type { FlaggedTweet } from "./monitor.js";

interface QueryScanSummary {
  query: string;
  label: string;
  tweetsFound: number;
  anomaliesFound: number;
}

const parseTweetDate = (dateStr: string): Date => {
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

const upsertAnomaly = (tweet: FlaggedTweet, scanId: string, scrapedAt: Date) =>
  prisma.twitterAnomaly.upsert({
    where: { tweetId: tweet.tweetId },
    update: {
      severityLevel: tweet.severityLevel,
      category: tweet.category,
      summary: tweet.summary,
      detectedKeywords: tweet.detectedKeywords,
      location: tweet.location,
      scanId,
    },
    create: {
      tweetId: tweet.tweetId,
      text: tweet.text,
      userId: tweet.userId,
      username: tweet.username,
      displayName: tweet.displayName,
      followerCount: tweet.followerCount,
      isVerified: tweet.isVerified,
      language: tweet.language,
      favoriteCount: tweet.favoriteCount,
      retweetCount: tweet.retweetCount,
      replyCount: tweet.replyCount,
      views: tweet.views,
      mediaUrls: tweet.mediaUrls,
      expandedUrl: tweet.expandedUrl,
      tweetCreatedAt: parseTweetDate(tweet.tweetCreatedAt),
      severityLevel: tweet.severityLevel,
      category: tweet.category,
      summary: tweet.summary,
      detectedKeywords: tweet.detectedKeywords,
      location: tweet.location,
      searchQuery: tweet.searchQuery,
      scrapedAt,
      scanId,
    },
  });

export const createScan = async (scanDate: string, scanTimestamp: string) =>
  prisma.twitterScan.create({
    data: {
      scanDate: new Date(scanDate),
      scanTimestamp: new Date(scanTimestamp),
      totalQueriesRun: 0,
      totalTweetsScanned: 0,
      anomaliesDetected: 0,
      queriesSummary: [],
    },
  });

/**
 * Returns tweet IDs that already exist as anomalies in the database.
 * Used to skip re-analyzing tweets from previous scans.
 */
export const getExistingAnomalyTweetIds = async (
  tweetIds: string[],
): Promise<Set<string>> => {
  if (tweetIds.length === 0) return new Set();

  const BATCH_SIZE = 200;
  const existing = new Set<string>();

  for (let i = 0; i < tweetIds.length; i += BATCH_SIZE) {
    const batch = tweetIds.slice(i, i + BATCH_SIZE);
    const rows = await prisma.twitterAnomaly.findMany({
      where: { tweetId: { in: batch } },
      select: { tweetId: true },
    });
    for (const row of rows) {
      existing.add(row.tweetId);
    }
  }

  return existing;
};

export const persistTweetAnomalies = async (
  anomalies: FlaggedTweet[],
  scanId: string,
): Promise<{ newAnomalies: number; updatedAnomalies: number }> => {
  if (anomalies.length === 0) return { newAnomalies: 0, updatedAnomalies: 0 };

  const scrapedAt = new Date();
  let newAnomalies = 0;
  let updatedAnomalies = 0;

  const DB_BATCH_SIZE = 10;
  for (let i = 0; i < anomalies.length; i += DB_BATCH_SIZE) {
    const batch = anomalies.slice(i, i + DB_BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (tweet) => {
        const existing = await prisma.twitterAnomaly.findUnique({
          where: { tweetId: tweet.tweetId },
          select: { id: true },
        });
        await upsertAnomaly(tweet, scanId, scrapedAt);
        return existing ? "updated" : "new";
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value === "new") newAnomalies++;
        else updatedAnomalies++;
      } else {
        console.error(
          "[Twitter Storage] Failed to persist anomaly:",
          result.reason,
        );
      }
    }
  }

  return { newAnomalies, updatedAnomalies };
};

export const updateScanTotals = async (
  scanId: string,
  totals: {
    totalQueriesRun: number;
    totalTweetsScanned: number;
    anomaliesDetected: number;
    queriesSummary: QueryScanSummary[];
  },
) =>
  prisma.twitterScan.update({
    where: { id: scanId },
    data: {
      totalQueriesRun: totals.totalQueriesRun,
      totalTweetsScanned: totals.totalTweetsScanned,
      anomaliesDetected: totals.anomaliesDetected,
      queriesSummary: totals.queriesSummary as any,
    },
  });
