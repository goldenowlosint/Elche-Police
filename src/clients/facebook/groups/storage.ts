import prisma from "../../../lib/prisma.js";
import type { MonitoringReport, FlaggedPost } from "./monitor.js";

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

export const persistMonitoringReport = async (
  report: MonitoringReport,
): Promise<{ scanId: string; newAnomalies: number; updatedAnomalies: number }> => {
  const scrapedAt = new Date();

  const scan = await prisma.facebookGroupScan.create({
    data: {
      scanDate: new Date(report.scanDate),
      scanTimestamp: new Date(report.scanTimestamp),
      scrapedAt,
      totalGroupsScanned: report.totalGroupsScanned,
      totalPostsScanned: report.totalPostsScanned,
      anomaliesDetected: report.anomaliesDetected,
      groupsSummary: report.groupsSummary as any,
    },
  });

  let newAnomalies = 0;
  let updatedAnomalies = 0;

  const BATCH_SIZE = 10;
  for (let i = 0; i < report.anomalies.length; i += BATCH_SIZE) {
    const batch = report.anomalies.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (post) => {
        const existing = await prisma.facebookAnomaly.findUnique({
          where: { postId: post.postId },
          select: { id: true },
        });

        await upsertAnomaly(post, scan.id, scrapedAt);
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

  return { scanId: scan.id, newAnomalies, updatedAnomalies };
};
