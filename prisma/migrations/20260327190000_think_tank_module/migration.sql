CREATE TYPE "ThinkTankIdeaCategory" AS ENUM ('PUBLICATION', 'MARKETING', 'SALES', 'ELEARNING', 'CHEMICAL', 'SFT_APPS', 'GLOBAL', 'OTHER', 'ACCOUNTS');
CREATE TYPE "ThinkTankIdeaStatus" AS ENUM ('DRAFT', 'ACTIVE', 'LOCKED', 'REVEALED', 'MERGED', 'ARCHIVED');
CREATE TYPE "ThinkTankVoteState" AS ENUM ('LIKE', 'UNLIKE', 'NEUTRAL');
CREATE TYPE "ThinkTankParticipantRole" AS ENUM ('PLANNER', 'MERGED_PARTNER', 'SELF_OPTED', 'CO_OPTED');
CREATE TYPE "ThinkTankCycleStatus" AS ENUM ('ACTIVE', 'LOCKED', 'REVEALED');
CREATE TYPE "ThinkTankDuplicateDecision" AS ENUM ('MERGE', 'PROCEED_AS_UNIQUE', 'PENDING_REVIEW');

CREATE TABLE "ThinkTankIdeaCycle" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "windowEnd" TIMESTAMP(3) NOT NULL,
  "revealAt" TIMESTAMP(3) NOT NULL,
  "status" "ThinkTankCycleStatus" NOT NULL DEFAULT 'ACTIVE',
  "revealedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ThinkTankIdeaCycle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ThinkTankIdea" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "cycleId" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" "ThinkTankIdeaCategory" NOT NULL,
  "status" "ThinkTankIdeaStatus" NOT NULL DEFAULT 'DRAFT',
  "plannerEncrypted" TEXT NOT NULL,
  "plannerHash" TEXT NOT NULL,
  "visibleAuthorId" TEXT,
  "revealedAt" TIMESTAMP(3),
  "duplicateDecision" "ThinkTankDuplicateDecision",
  "weightedScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "voteCount" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ThinkTankIdea_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ThinkTankIdeaPartner" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "userEncrypted" TEXT NOT NULL,
  "userHash" TEXT NOT NULL,
  "visibleUserId" TEXT,
  "roleType" "ThinkTankParticipantRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ThinkTankIdeaPartner_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ThinkTankIdeaTeamMember" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "userEncrypted" TEXT NOT NULL,
  "userHash" TEXT NOT NULL,
  "visibleUserId" TEXT,
  "roleType" "ThinkTankParticipantRole" NOT NULL DEFAULT 'CO_OPTED',
  "sourceCategory" "ThinkTankIdeaCategory",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ThinkTankIdeaTeamMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ThinkTankIdeaVote" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "cycleId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "voterEncrypted" TEXT NOT NULL,
  "voterHash" TEXT NOT NULL,
  "vote" "ThinkTankVoteState" NOT NULL,
  "weight" INTEGER NOT NULL,
  "weightedValue" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ThinkTankIdeaVote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ThinkTankIdeaAttachment" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "fileRecordId" TEXT,
  "url" TEXT NOT NULL,
  "filename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "scrubStatus" TEXT DEFAULT 'SCRUBBED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ThinkTankIdeaAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ThinkTankIdeaAuditEvent" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "outcome" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ThinkTankIdeaAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ThinkTankIdeaDuplicateMatch" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "matchedIdeaId" TEXT NOT NULL,
  "similarityScore" DOUBLE PRECISION NOT NULL,
  "decision" "ThinkTankDuplicateDecision",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ThinkTankIdeaDuplicateMatch_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ThinkTankPointsMapping" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "userEncrypted" TEXT NOT NULL,
  "userHash" TEXT NOT NULL,
  "visibleUserId" TEXT,
  "points" DOUBLE PRECISION NOT NULL,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ThinkTankPointsMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ThinkTankIdeaPartner_ideaId_userHash_key" ON "ThinkTankIdeaPartner"("ideaId", "userHash");
CREATE UNIQUE INDEX "ThinkTankIdeaTeamMember_ideaId_userHash_key" ON "ThinkTankIdeaTeamMember"("ideaId", "userHash");
CREATE UNIQUE INDEX "ThinkTankIdeaVote_ideaId_cycleId_voterHash_key" ON "ThinkTankIdeaVote"("ideaId", "cycleId", "voterHash");

CREATE INDEX "ThinkTankIdeaCycle_companyId_revealAt_idx" ON "ThinkTankIdeaCycle"("companyId", "revealAt");
CREATE INDEX "ThinkTankIdeaCycle_status_idx" ON "ThinkTankIdeaCycle"("status");
CREATE INDEX "ThinkTankIdea_companyId_status_idx" ON "ThinkTankIdea"("companyId", "status");
CREATE INDEX "ThinkTankIdea_cycleId_idx" ON "ThinkTankIdea"("cycleId");
CREATE INDEX "ThinkTankIdea_category_idx" ON "ThinkTankIdea"("category");
CREATE INDEX "ThinkTankIdea_plannerHash_idx" ON "ThinkTankIdea"("plannerHash");
CREATE INDEX "ThinkTankIdea_revealedAt_idx" ON "ThinkTankIdea"("revealedAt");
CREATE INDEX "ThinkTankIdeaPartner_ideaId_roleType_idx" ON "ThinkTankIdeaPartner"("ideaId", "roleType");
CREATE INDEX "ThinkTankIdeaTeamMember_ideaId_idx" ON "ThinkTankIdeaTeamMember"("ideaId");
CREATE INDEX "ThinkTankIdeaVote_ideaId_idx" ON "ThinkTankIdeaVote"("ideaId");
CREATE INDEX "ThinkTankIdeaVote_cycleId_idx" ON "ThinkTankIdeaVote"("cycleId");
CREATE INDEX "ThinkTankIdeaAttachment_ideaId_idx" ON "ThinkTankIdeaAttachment"("ideaId");
CREATE INDEX "ThinkTankIdeaAttachment_fileRecordId_idx" ON "ThinkTankIdeaAttachment"("fileRecordId");
CREATE INDEX "ThinkTankIdeaAuditEvent_ideaId_createdAt_idx" ON "ThinkTankIdeaAuditEvent"("ideaId", "createdAt");
CREATE INDEX "ThinkTankIdeaAuditEvent_actorUserId_idx" ON "ThinkTankIdeaAuditEvent"("actorUserId");
CREATE INDEX "ThinkTankIdeaDuplicateMatch_ideaId_idx" ON "ThinkTankIdeaDuplicateMatch"("ideaId");
CREATE INDEX "ThinkTankIdeaDuplicateMatch_matchedIdeaId_idx" ON "ThinkTankIdeaDuplicateMatch"("matchedIdeaId");
CREATE INDEX "ThinkTankPointsMapping_ideaId_idx" ON "ThinkTankPointsMapping"("ideaId");
CREATE INDEX "ThinkTankPointsMapping_visibleUserId_idx" ON "ThinkTankPointsMapping"("visibleUserId");

ALTER TABLE "ThinkTankIdeaCycle" ADD CONSTRAINT "ThinkTankIdeaCycle_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThinkTankIdea" ADD CONSTRAINT "ThinkTankIdea_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThinkTankIdea" ADD CONSTRAINT "ThinkTankIdea_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ThinkTankIdeaCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThinkTankIdea" ADD CONSTRAINT "ThinkTankIdea_visibleAuthorId_fkey" FOREIGN KEY ("visibleAuthorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ThinkTankIdeaPartner" ADD CONSTRAINT "ThinkTankIdeaPartner_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThinkTankIdeaPartner" ADD CONSTRAINT "ThinkTankIdeaPartner_visibleUserId_fkey" FOREIGN KEY ("visibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ThinkTankIdeaTeamMember" ADD CONSTRAINT "ThinkTankIdeaTeamMember_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThinkTankIdeaTeamMember" ADD CONSTRAINT "ThinkTankIdeaTeamMember_visibleUserId_fkey" FOREIGN KEY ("visibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ThinkTankIdeaVote" ADD CONSTRAINT "ThinkTankIdeaVote_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThinkTankIdeaVote" ADD CONSTRAINT "ThinkTankIdeaVote_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ThinkTankIdeaCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThinkTankIdeaVote" ADD CONSTRAINT "ThinkTankIdeaVote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThinkTankIdeaAttachment" ADD CONSTRAINT "ThinkTankIdeaAttachment_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThinkTankIdeaAttachment" ADD CONSTRAINT "ThinkTankIdeaAttachment_fileRecordId_fkey" FOREIGN KEY ("fileRecordId") REFERENCES "FileRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ThinkTankIdeaAuditEvent" ADD CONSTRAINT "ThinkTankIdeaAuditEvent_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThinkTankIdeaAuditEvent" ADD CONSTRAINT "ThinkTankIdeaAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ThinkTankIdeaDuplicateMatch" ADD CONSTRAINT "ThinkTankIdeaDuplicateMatch_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThinkTankIdeaDuplicateMatch" ADD CONSTRAINT "ThinkTankIdeaDuplicateMatch_matchedIdeaId_fkey" FOREIGN KEY ("matchedIdeaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThinkTankPointsMapping" ADD CONSTRAINT "ThinkTankPointsMapping_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ThinkTankPointsMapping" ADD CONSTRAINT "ThinkTankPointsMapping_visibleUserId_fkey" FOREIGN KEY ("visibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
