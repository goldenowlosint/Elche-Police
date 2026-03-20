import prisma from "../../../lib/prisma.js";
import type { FlaggedPost } from "./monitor.js";

interface GroupScanSummary {
  groupId: string;
  groupName: string;
  postsScanned: number;
  anomaliesFound: number;
}

const parsePostDate = (dateStr: string): Date => {
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
};

const upsertAnomaly = (post: FlaggedPost, scanId: string, scrapedAt: Date) =>
  prisma.facebookAnomaly.upsert({
    where: { postId: post.postId },
    update: {
      severityLevel: post.severityLevel,
      category: post.category,
      summary: post.summary,
      detectedKeywords: post.detectedKeywords,
      location: post.location,
      scanId,
    },
    create: {
      postId: post.postId,
      groupId: post.groupId,
      groupName: post.groupName,
      message: post.message,
      imageUrl: post.imageUrl,
      attachmentUrl: post.attachmentUrl,
      createdTime: parsePostDate(post.createdTime),
      authorId: post.authorId,
      authorName: post.authorName,
      severityLevel: post.severityLevel,
      category: post.category,
      summary: post.summary,
      detectedKeywords: post.detectedKeywords,
      location: post.location,
      scrapedAt,
      scanId,
    },
  });

export const createScan = async (scanDate: string, scanTimestamp: string) => {
  return prisma.facebookGroupScan.create({
    data: {
      scanDate: new Date(scanDate),
      scanTimestamp: new Date(scanTimestamp),
      totalGroupsScanned: 0,
      totalPostsScanned: 0,
      anomaliesDetected: 0,
      groupsSummary: [],
    },
  });
};

/**
 * Persists anomalies for a single group right after AI analysis completes.
 * Returns counts of new vs updated anomalies.
 */
export const persistGroupAnomalies = async (
  anomalies: FlaggedPost[],
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
      batch.map(async (post) => {
        const existing = await prisma.facebookAnomaly.findUnique({
          where: { postId: post.postId },
          select: { id: true },
        });
        await upsertAnomaly(post, scanId, scrapedAt);
        return existing ? "updated" : "new";
      }),
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        if (result.value === "new") newAnomalies++;
        else updatedAnomalies++;
      } else {
        console.error("[Facebook Storage] Failed to persist anomaly:", result.reason);
      }
    }
  }

  return { newAnomalies, updatedAnomalies };
};

/**
 * Updates the scan record with final totals after all groups are processed.
 */
export const updateScanTotals = async (
  scanId: string,
  totals: {
    totalGroupsScanned: number;
    totalPostsScanned: number;
    anomaliesDetected: number;
    groupsSummary: GroupScanSummary[];
  },
) => {
  return prisma.facebookGroupScan.update({
    where: { id: scanId },
    data: {
      totalGroupsScanned: totals.totalGroupsScanned,
      totalPostsScanned: totals.totalPostsScanned,
      anomaliesDetected: totals.anomaliesDetected,
      groupsSummary: totals.groupsSummary as any,
    },
  });
};
