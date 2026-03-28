-- CreateEnum
CREATE TYPE "ProblemSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ProblemStatus" AS ENUM ('SUBMITTED', 'ACKNOWLEDGED', 'NEEDS_INFO', 'IN_REVIEW', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED', 'REOPENED', 'MERGED');

-- CreateEnum
CREATE TYPE "ProblemVisibility" AS ENUM ('NAMED', 'ANONYMOUS_TO_PEERS', 'RESTRICTED_ANONYMOUS');

-- CreateEnum
CREATE TYPE "ProblemRecurrence" AS ENUM ('ONE_TIME', 'RECURRING', 'ALWAYS_HAPPENING');

-- CreateEnum
CREATE TYPE "ProblemImpactType" AS ENUM ('PERSONAL_BLOCKER', 'TEAM_BLOCKER', 'CUSTOMER_ISSUE', 'REVENUE_ISSUE', 'COMPLIANCE_RISK', 'SYSTEM_APP_ISSUE', 'OTHER');

-- CreateTable
CREATE TABLE "ProblemIssue" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" "ProblemSeverity" NOT NULL DEFAULT 'MEDIUM',
    "status" "ProblemStatus" NOT NULL DEFAULT 'SUBMITTED',
    "visibility" "ProblemVisibility" NOT NULL DEFAULT 'NAMED',
    "recurrence" "ProblemRecurrence" NOT NULL DEFAULT 'ONE_TIME',
    "impactType" "ProblemImpactType" NOT NULL DEFAULT 'OTHER',
    "location" TEXT,
    "affectedArea" TEXT,
    "departmentName" TEXT,
    "isSensitive" BOOLEAN NOT NULL DEFAULT false,
    "aiSummary" TEXT,
    "rootCauseSummary" TEXT,
    "resolutionSummary" TEXT,
    "dueAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "reopenedAt" TIMESTAMP(3),
    "mergedIntoId" TEXT,
    "reportedById" TEXT NOT NULL,
    "assignedToId" TEXT,
    "resolvedById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIssueComment" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemIssueComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIssueInternalNote" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "authorUserId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProblemIssueInternalNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIssueAttachment" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "fileRecordId" TEXT,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemIssueAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIssueWatcher" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemIssueWatcher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIssueAssignmentHistory" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "previousAssigneeId" TEXT,
    "newAssigneeId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemIssueAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIssueStatusHistory" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "fromStatus" "ProblemStatus",
    "toStatus" "ProblemStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemIssueStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIssueDuplicateLink" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "matchedIssueId" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "decision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemIssueDuplicateLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIssueAuditEvent" (
    "id" TEXT NOT NULL,
    "issueId" TEXT,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemIssueAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProblemIssueResolutionFeedback" (
    "id" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProblemIssueResolutionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProblemIssue_companyId_status_severity_idx" ON "ProblemIssue"("companyId", "status", "severity");
CREATE INDEX "ProblemIssue_reportedById_createdAt_idx" ON "ProblemIssue"("reportedById", "createdAt");
CREATE INDEX "ProblemIssue_assignedToId_status_idx" ON "ProblemIssue"("assignedToId", "status");
CREATE INDEX "ProblemIssue_mergedIntoId_idx" ON "ProblemIssue"("mergedIntoId");

CREATE INDEX "ProblemIssueComment_issueId_createdAt_idx" ON "ProblemIssueComment"("issueId", "createdAt");
CREATE INDEX "ProblemIssueComment_authorUserId_idx" ON "ProblemIssueComment"("authorUserId");

CREATE INDEX "ProblemIssueInternalNote_issueId_createdAt_idx" ON "ProblemIssueInternalNote"("issueId", "createdAt");
CREATE INDEX "ProblemIssueInternalNote_authorUserId_idx" ON "ProblemIssueInternalNote"("authorUserId");

CREATE INDEX "ProblemIssueAttachment_issueId_idx" ON "ProblemIssueAttachment"("issueId");
CREATE INDEX "ProblemIssueAttachment_fileRecordId_idx" ON "ProblemIssueAttachment"("fileRecordId");

CREATE UNIQUE INDEX "ProblemIssueWatcher_issueId_userId_key" ON "ProblemIssueWatcher"("issueId", "userId");
CREATE INDEX "ProblemIssueWatcher_userId_idx" ON "ProblemIssueWatcher"("userId");

CREATE INDEX "ProblemIssueAssignmentHistory_issueId_createdAt_idx" ON "ProblemIssueAssignmentHistory"("issueId", "createdAt");
CREATE INDEX "ProblemIssueAssignmentHistory_actorUserId_idx" ON "ProblemIssueAssignmentHistory"("actorUserId");

CREATE INDEX "ProblemIssueStatusHistory_issueId_createdAt_idx" ON "ProblemIssueStatusHistory"("issueId", "createdAt");
CREATE INDEX "ProblemIssueStatusHistory_actorUserId_idx" ON "ProblemIssueStatusHistory"("actorUserId");

CREATE INDEX "ProblemIssueDuplicateLink_issueId_idx" ON "ProblemIssueDuplicateLink"("issueId");
CREATE INDEX "ProblemIssueDuplicateLink_matchedIssueId_idx" ON "ProblemIssueDuplicateLink"("matchedIssueId");

CREATE INDEX "ProblemIssueAuditEvent_issueId_createdAt_idx" ON "ProblemIssueAuditEvent"("issueId", "createdAt");
CREATE INDEX "ProblemIssueAuditEvent_actorUserId_idx" ON "ProblemIssueAuditEvent"("actorUserId");

CREATE INDEX "ProblemIssueResolutionFeedback_issueId_createdAt_idx" ON "ProblemIssueResolutionFeedback"("issueId", "createdAt");
CREATE INDEX "ProblemIssueResolutionFeedback_userId_idx" ON "ProblemIssueResolutionFeedback"("userId");

-- AddForeignKey
ALTER TABLE "ProblemIssue"
    ADD CONSTRAINT "ProblemIssue_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProblemIssue"
    ADD CONSTRAINT "ProblemIssue_reportedById_fkey"
    FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProblemIssue"
    ADD CONSTRAINT "ProblemIssue_assignedToId_fkey"
    FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProblemIssue"
    ADD CONSTRAINT "ProblemIssue_resolvedById_fkey"
    FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProblemIssue"
    ADD CONSTRAINT "ProblemIssue_mergedIntoId_fkey"
    FOREIGN KEY ("mergedIntoId") REFERENCES "ProblemIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProblemIssueComment"
    ADD CONSTRAINT "ProblemIssueComment_issueId_fkey"
    FOREIGN KEY ("issueId") REFERENCES "ProblemIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProblemIssueComment"
    ADD CONSTRAINT "ProblemIssueComment_authorUserId_fkey"
    FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProblemIssueInternalNote"
    ADD CONSTRAINT "ProblemIssueInternalNote_issueId_fkey"
    FOREIGN KEY ("issueId") REFERENCES "ProblemIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProblemIssueInternalNote"
    ADD CONSTRAINT "ProblemIssueInternalNote_authorUserId_fkey"
    FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProblemIssueAttachment"
    ADD CONSTRAINT "ProblemIssueAttachment_issueId_fkey"
    FOREIGN KEY ("issueId") REFERENCES "ProblemIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProblemIssueAttachment"
    ADD CONSTRAINT "ProblemIssueAttachment_fileRecordId_fkey"
    FOREIGN KEY ("fileRecordId") REFERENCES "FileRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProblemIssueWatcher"
    ADD CONSTRAINT "ProblemIssueWatcher_issueId_fkey"
    FOREIGN KEY ("issueId") REFERENCES "ProblemIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProblemIssueWatcher"
    ADD CONSTRAINT "ProblemIssueWatcher_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProblemIssueAssignmentHistory"
    ADD CONSTRAINT "ProblemIssueAssignmentHistory_issueId_fkey"
    FOREIGN KEY ("issueId") REFERENCES "ProblemIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProblemIssueAssignmentHistory"
    ADD CONSTRAINT "ProblemIssueAssignmentHistory_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProblemIssueStatusHistory"
    ADD CONSTRAINT "ProblemIssueStatusHistory_issueId_fkey"
    FOREIGN KEY ("issueId") REFERENCES "ProblemIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProblemIssueStatusHistory"
    ADD CONSTRAINT "ProblemIssueStatusHistory_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProblemIssueDuplicateLink"
    ADD CONSTRAINT "ProblemIssueDuplicateLink_issueId_fkey"
    FOREIGN KEY ("issueId") REFERENCES "ProblemIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProblemIssueDuplicateLink"
    ADD CONSTRAINT "ProblemIssueDuplicateLink_matchedIssueId_fkey"
    FOREIGN KEY ("matchedIssueId") REFERENCES "ProblemIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProblemIssueAuditEvent"
    ADD CONSTRAINT "ProblemIssueAuditEvent_issueId_fkey"
    FOREIGN KEY ("issueId") REFERENCES "ProblemIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProblemIssueAuditEvent"
    ADD CONSTRAINT "ProblemIssueAuditEvent_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProblemIssueResolutionFeedback"
    ADD CONSTRAINT "ProblemIssueResolutionFeedback_issueId_fkey"
    FOREIGN KEY ("issueId") REFERENCES "ProblemIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProblemIssueResolutionFeedback"
    ADD CONSTRAINT "ProblemIssueResolutionFeedback_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
