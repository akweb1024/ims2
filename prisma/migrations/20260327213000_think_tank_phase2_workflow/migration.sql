-- Alter ThinkTankIdea for review workflow and implementation tracking
ALTER TABLE "ThinkTankIdea"
ADD COLUMN "reviewStage" TEXT NOT NULL DEFAULT 'SUBMITTED',
ADD COLUMN "implementationStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN "decisionNotes" TEXT,
ADD COLUMN "shortlistedAt" TIMESTAMP(3),
ADD COLUMN "approvedAt" TIMESTAMP(3),
ADD COLUMN "implementedAt" TIMESTAMP(3),
ADD COLUMN "decisionById" TEXT;

CREATE INDEX "ThinkTankIdea_reviewStage_idx" ON "ThinkTankIdea"("reviewStage");
CREATE INDEX "ThinkTankIdea_implementationStatus_idx" ON "ThinkTankIdea"("implementationStatus");

ALTER TABLE "ThinkTankIdea"
ADD CONSTRAINT "ThinkTankIdea_decisionById_fkey"
FOREIGN KEY ("decisionById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ThinkTankIdeaComment" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "authorUserId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "isInternal" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ThinkTankIdeaComment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ThinkTankIdeaComment_ideaId_createdAt_idx" ON "ThinkTankIdeaComment"("ideaId", "createdAt");
CREATE INDEX "ThinkTankIdeaComment_authorUserId_idx" ON "ThinkTankIdeaComment"("authorUserId");

ALTER TABLE "ThinkTankIdeaComment"
ADD CONSTRAINT "ThinkTankIdeaComment_ideaId_fkey"
FOREIGN KEY ("ideaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ThinkTankIdeaComment"
ADD CONSTRAINT "ThinkTankIdeaComment_authorUserId_fkey"
FOREIGN KEY ("authorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
