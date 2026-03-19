-- CreateTable
CREATE TABLE "facebook_group_scans" (
    "id" TEXT NOT NULL,
    "scanDate" DATE NOT NULL,
    "scanTimestamp" TIMESTAMP(3) NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalGroupsScanned" INTEGER NOT NULL,
    "totalPostsScanned" INTEGER NOT NULL,
    "anomaliesDetected" INTEGER NOT NULL,
    "groupsSummary" JSONB NOT NULL,

    CONSTRAINT "facebook_group_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "facebook_anomalies" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "message" TEXT,
    "imageUrl" TEXT,
    "attachmentUrl" TEXT,
    "createdTime" TIMESTAMP(3) NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT,
    "severityLevel" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detectedKeywords" TEXT[],
    "location" TEXT,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scanId" TEXT,

    CONSTRAINT "facebook_anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "facebook_anomalies_postId_key" ON "facebook_anomalies"("postId");

-- CreateIndex
CREATE INDEX "facebook_anomalies_groupId_idx" ON "facebook_anomalies"("groupId");

-- CreateIndex
CREATE INDEX "facebook_anomalies_category_idx" ON "facebook_anomalies"("category");

-- CreateIndex
CREATE INDEX "facebook_anomalies_severityLevel_idx" ON "facebook_anomalies"("severityLevel");

-- CreateIndex
CREATE INDEX "facebook_anomalies_scrapedAt_idx" ON "facebook_anomalies"("scrapedAt");

-- AddForeignKey
ALTER TABLE "facebook_anomalies" ADD CONSTRAINT "facebook_anomalies_scanId_fkey" FOREIGN KEY ("scanId") REFERENCES "facebook_group_scans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
