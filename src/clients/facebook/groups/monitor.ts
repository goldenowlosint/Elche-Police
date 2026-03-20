import * as Sentry from "@sentry/node";
import { FACEBOOK_GROUPS, type FacebookGroup } from "./groups.js";
import { fetchGroupPosts, type FacebookPost } from "./scraper.js";
import { detectAnomaly, type AnomalyResult } from "./validate.js";
import { saveToJson } from "../../../lib/save-to-json.js";
import {
  createScan,
  persistGroupAnomalies,
  updateScanTotals,
} from "./storage.js";

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

const AI_CONCURRENCY = 50;

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

/**
 * Sends posts to OpenAI for anomaly detection in batches of AI_CONCURRENCY (50).
 * Returns only the posts flagged as anomalies.
 */
const analyzePostsWithAI = async (
  posts: FacebookPost[],
  group: FacebookGroup,
): Promise<FlaggedPost[]> => {
  const flagged: FlaggedPost[] = [];

  for (let i = 0; i < posts.length; i += AI_CONCURRENCY) {
    const batch = posts.slice(i, i + AI_CONCURRENCY);

    console.log(
      `[Facebook Monitor]   → AI batch ${Math.floor(i / AI_CONCURRENCY) + 1}/${Math.ceil(posts.length / AI_CONCURRENCY)} ` +
        `(${batch.length} posts)`,
    );

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

    // Small delay between AI batches to avoid overwhelming the API
    if (i + AI_CONCURRENCY < posts.length) {
      await delay(300);
    }
  }

  return flagged;
};

/**
 * Pipeline per group: fetch posts → analyze with AI → persist anomalies to DB → next group.
 * No raw posts are saved; only confirmed anomalies reach the database.
 */
export const runFacebookMonitoring = async (): Promise<void> => {
  const startTime = Date.now();
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toISOString().replace(/[:.]/g, "-");

  console.log(`[Facebook Monitor] Starting scan at ${now.toISOString()}`);

  let scan: { id: string };
  try {
    scan = await createScan(dateStr, now.toISOString());
  } catch (error) {
    console.error("[Facebook Monitor] Failed to create scan record:", error);
    Sentry.captureException(error, {
      tags: { module: "facebookMonitor", phase: "createScan" },
    });
    return;
  }

  const groupsSummary: GroupScanSummary[] = [];
  const allAnomalies: FlaggedPost[] = [];
  let totalPostsScanned = 0;

  for (const group of FACEBOOK_GROUPS) {
    try {
      console.log(
        `[Facebook Monitor] Fetching posts from: ${group.name} (${group.id})`,
      );

      // 1. Fetch posts from Facebook API
      const posts = await fetchGroupPosts(group);
      console.log(
        `[Facebook Monitor] Fetched ${posts.length} posts from ${group.name}`,
      );

      // 2. Send all posts to AI for anomaly detection (50 at a time)
      const flaggedPosts = await analyzePostsWithAI(posts, group);
      console.log(
        `[Facebook Monitor] ${group.name}: ${flaggedPosts.length} anomalies / ${posts.length} posts`,
      );

      // 3. Immediately persist this group's anomalies to the database
      if (flaggedPosts.length > 0) {
        const { newAnomalies, updatedAnomalies } =
          await persistGroupAnomalies(flaggedPosts, scan.id);
        console.log(
          `[Facebook Monitor] ${group.name}: DB persisted — new: ${newAnomalies}, updated: ${updatedAnomalies}`,
        );
      }

      totalPostsScanned += posts.length;
      allAnomalies.push(...flaggedPosts);
      groupsSummary.push({
        groupId: group.id,
        groupName: group.name,
        postsScanned: posts.length,
        anomaliesFound: flaggedPosts.length,
      });

      // Gap between groups for RapidAPI rate limits
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

  // Update the scan record with final totals
  try {
    await updateScanTotals(scan.id, {
      totalGroupsScanned: groupsSummary.length,
      totalPostsScanned: totalPostsScanned,
      anomaliesDetected: allAnomalies.length,
      groupsSummary,
    });
  } catch (error) {
    console.error("[Facebook Monitor] Failed to update scan totals:", error);
    Sentry.captureException(error, {
      tags: { module: "facebookMonitor", phase: "updateScanTotals" },
    });
  }

  // Save JSON report for local reference
  if (allAnomalies.length > 0) {
    const report: MonitoringReport = {
      scanDate: dateStr,
      scanTimestamp: now.toISOString(),
      totalGroupsScanned: groupsSummary.length,
      totalPostsScanned: totalPostsScanned,
      anomaliesDetected: allAnomalies.length,
      groupsSummary,
      anomalies: allAnomalies,
    };
    const filename = `facebook-anomalies-${timeStr}`;
    await saveToJson(filename, report);
    console.log(`[Facebook Monitor] Report saved: ${filename}.json`);
  } else {
    console.log("[Facebook Monitor] No anomalies detected in this scan");
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(
    `[Facebook Monitor] Scan complete in ${elapsed}s — ` +
      `${allAnomalies.length} anomalies from ${totalPostsScanned} posts ` +
      `across ${groupsSummary.length} groups`,
  );
};
