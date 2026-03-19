import * as Sentry from "@sentry/node";
import { FACEBOOK_GROUPS, type FacebookGroup } from "./groups.js";
import { fetchGroupPosts, type FacebookPost } from "./scraper.js";
import { detectAnomaly, type AnomalyResult } from "./validate.js";
import { saveToJson } from "../../../lib/save-to-json.js";
import { persistMonitoringReport } from "./storage.js";

export interface FlaggedPost {
  postId: string;
  groupId: string;
  groupName: string;
  message: string | null;
  imageUrl: string | null;
  attachmentUrl: string | null;
  createdTime: string;
  authorId: string | null;
  authorName: string | null;
  severityLevel: number;
  category: string;
  summary: string;
  detectedKeywords: string[];
  location: string | null;
}

interface GroupScanSummary {
  groupId: string;
  groupName: string;
  postsScanned: number;
  anomaliesFound: number;
}

export interface MonitoringReport {
  scanDate: string;
  scanTimestamp: string;
  totalGroupsScanned: number;
  totalPostsScanned: number;
  anomaliesDetected: number;
  groupsSummary: GroupScanSummary[];
  anomalies: FlaggedPost[];
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const extractFlaggedPost = (
  post: FacebookPost,
  group: FacebookGroup,
  analysis: AnomalyResult,
): FlaggedPost => {
  const attachment = post.attachments?.data?.[0];

  return {
    postId: post.id,
    groupId: group.id,
    groupName: group.name,
    message: post.message || attachment?.description || null,
    imageUrl: attachment?.media?.image?.src || null,
    attachmentUrl: attachment?.url || null,
    createdTime: post.created_time,
    authorId: post.from?.id || null,
    authorName: post.from?.name || null,
    severityLevel: analysis.severityLevel ?? 0,
    category: analysis.category ?? "other_concern",
    summary: analysis.summary ?? "",
    detectedKeywords: analysis.detectedKeywords ?? [],
    location: analysis.location ?? null,
  };
};

const processPostsBatch = async (
  posts: FacebookPost[],
  group: FacebookGroup,
  concurrency: number = 5,
  delayBetweenBatchesMs: number = 500,
): Promise<FlaggedPost[]> => {
  const flagged: FlaggedPost[] = [];

  for (let i = 0; i < posts.length; i += concurrency) {
    const batch = posts.slice(i, i + concurrency);

    const results = await Promise.allSettled(
      batch.map(async (post) => {
        const analysis = await detectAnomaly(JSON.stringify(post), group.name);
        if (analysis?.isAnomaly) {
          return extractFlaggedPost(post, group, analysis);
        }
        return null;
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        flagged.push(result.value);
      }
    }

    if (i + concurrency < posts.length) {
      await delay(delayBetweenBatchesMs);
    }
  }

  return flagged;
};

export const runFacebookMonitoring = async (): Promise<void> => {
  const startTime = Date.now();
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toISOString().replace(/[:.]/g, "-");

  console.log(`[Facebook Monitor] Starting scan at ${now.toISOString()}`);

  const report: MonitoringReport = {
    scanDate: dateStr,
    scanTimestamp: now.toISOString(),
    totalGroupsScanned: 0,
    totalPostsScanned: 0,
    anomaliesDetected: 0,
    groupsSummary: [],
    anomalies: [],
  };

  for (const group of FACEBOOK_GROUPS) {
    try {
      console.log(
        `[Facebook Monitor] Fetching posts from: ${group.name} (${group.id})`,
      );

      const posts = await fetchGroupPosts(group);
      console.log(
        `[Facebook Monitor] Fetched ${posts.length} posts from ${group.name}`,
      );

      const flaggedPosts = await processPostsBatch(posts, group);

      report.totalGroupsScanned++;
      report.totalPostsScanned += posts.length;
      report.anomaliesDetected += flaggedPosts.length;
      report.anomalies.push(...flaggedPosts);
      report.groupsSummary.push({
        groupId: group.id,
        groupName: group.name,
        postsScanned: posts.length,
        anomaliesFound: flaggedPosts.length,
      });

      console.log(
        `[Facebook Monitor] ${group.name}: ${flaggedPosts.length} anomalies / ${posts.length} posts`,
      );

      // 2 s gap between groups to stay within RapidAPI rate limits (500 req/hour)
      await delay(2000);
    } catch (error) {
      console.error(
        `[Facebook Monitor] Error processing group ${group.name}:`,
        error,
      );
      Sentry.captureException(error, {
        tags: { module: "facebookMonitor", groupId: group.id },
      });
    }
  }

  if (report.anomalies.length > 0) {
    const filename = `facebook-anomalies-${timeStr}`;
    await saveToJson(filename, report);
    console.log(`[Facebook Monitor] Report saved: ${filename}.json`);
  } else {
    console.log("[Facebook Monitor] No anomalies detected in this scan");
  }

  try {
    const { scanId, newAnomalies, updatedAnomalies } =
      await persistMonitoringReport(report);
    console.log(
      `[Facebook Monitor] Persisted to DB — scan: ${scanId}, ` +
        `new: ${newAnomalies}, updated: ${updatedAnomalies}`,
    );
  } catch (dbError) {
    console.error("[Facebook Monitor] Failed to persist to database:", dbError);
    Sentry.captureException(dbError, {
      tags: { module: "facebookMonitor", phase: "dbPersist" },
    });
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[Facebook Monitor] Scan complete in ${elapsed}s — ` +
      `${report.anomaliesDetected} anomalies from ${report.totalPostsScanned} posts ` +
      `across ${report.totalGroupsScanned} groups`,
  );
};
