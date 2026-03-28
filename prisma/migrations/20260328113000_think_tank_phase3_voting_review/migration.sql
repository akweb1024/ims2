-- Think Tank Phase 3: point-budget voting, planner Q&A, reviewer scorecards, and Super Admin veto

ALTER TABLE "ThinkTankIdeaCycle"
ADD COLUMN "cycleLabel" TEXT,
ADD COLUMN "renewalAt" TIMESTAMP(3);

ALTER TABLE "ThinkTankIdea"
ADD COLUMN "finalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "communityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "reviewerScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "ideaReadinessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "questionCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "isVetoed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "vetoedAt" TIMESTAMP(3),
ADD COLUMN "vetoedById" TEXT,
ADD COLUMN "vetoReason" TEXT;

CREATE INDEX "ThinkTankIdea_isVetoed_idx" ON "ThinkTankIdea"("isVetoed");

ALTER TABLE "ThinkTankIdea"
ADD CONSTRAINT "ThinkTankIdea_vetoedById_fkey"
FOREIGN KEY ("vetoedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ThinkTankIdeaVote"
ADD COLUMN "pointAllocation" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "maxAllowedPoints" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "ThinkTankPointAccount" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "cycleId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "basePoints" INTEGER NOT NULL,
  "maxPerIdeaPoints" INTEGER NOT NULL,
  "allocatedPoints" INTEGER NOT NULL DEFAULT 0,
  "remainingPoints" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ThinkTankPointAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ThinkTankPointAccount_cycleId_userId_key" ON "ThinkTankPointAccount"("cycleId", "userId");
CREATE INDEX "ThinkTankPointAccount_companyId_cycleId_idx" ON "ThinkTankPointAccount"("companyId", "cycleId");

ALTER TABLE "ThinkTankPointAccount"
ADD CONSTRAINT "ThinkTankPointAccount_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ThinkTankPointAccount"
ADD CONSTRAINT "ThinkTankPointAccount_cycleId_fkey"
FOREIGN KEY ("cycleId") REFERENCES "ThinkTankIdeaCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ThinkTankPointAccount"
ADD CONSTRAINT "ThinkTankPointAccount_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ThinkTankIdeaQuestion" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "askedByUserId" TEXT NOT NULL,
  "answeredByUserId" TEXT,
  "question" TEXT NOT NULL,
  "answer" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "answeredAt" TIMESTAMP(3),
  CONSTRAINT "ThinkTankIdeaQuestion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ThinkTankIdeaQuestion_ideaId_createdAt_idx" ON "ThinkTankIdeaQuestion"("ideaId", "createdAt");
CREATE INDEX "ThinkTankIdeaQuestion_askedByUserId_idx" ON "ThinkTankIdeaQuestion"("askedByUserId");
CREATE INDEX "ThinkTankIdeaQuestion_status_idx" ON "ThinkTankIdeaQuestion"("status");

ALTER TABLE "ThinkTankIdeaQuestion"
ADD CONSTRAINT "ThinkTankIdeaQuestion_ideaId_fkey"
FOREIGN KEY ("ideaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ThinkTankIdeaQuestion"
ADD CONSTRAINT "ThinkTankIdeaQuestion_askedByUserId_fkey"
FOREIGN KEY ("askedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ThinkTankIdeaQuestion"
ADD CONSTRAINT "ThinkTankIdeaQuestion_answeredByUserId_fkey"
FOREIGN KEY ("answeredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ThinkTankIdeaReviewerScore" (
  "id" TEXT NOT NULL,
  "ideaId" TEXT NOT NULL,
  "reviewerUserId" TEXT NOT NULL,
  "impactScore" INTEGER NOT NULL DEFAULT 0,
  "feasibilityScore" INTEGER NOT NULL DEFAULT 0,
  "costScore" INTEGER NOT NULL DEFAULT 0,
  "speedScore" INTEGER NOT NULL DEFAULT 0,
  "strategicFitScore" INTEGER NOT NULL DEFAULT 0,
  "scalabilityScore" INTEGER NOT NULL DEFAULT 0,
  "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ThinkTankIdeaReviewerScore_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ThinkTankIdeaReviewerScore_ideaId_reviewerUserId_key" ON "ThinkTankIdeaReviewerScore"("ideaId", "reviewerUserId");
CREATE INDEX "ThinkTankIdeaReviewerScore_reviewerUserId_idx" ON "ThinkTankIdeaReviewerScore"("reviewerUserId");

ALTER TABLE "ThinkTankIdeaReviewerScore"
ADD CONSTRAINT "ThinkTankIdeaReviewerScore_ideaId_fkey"
FOREIGN KEY ("ideaId") REFERENCES "ThinkTankIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ThinkTankIdeaReviewerScore"
ADD CONSTRAINT "ThinkTankIdeaReviewerScore_reviewerUserId_fkey"
FOREIGN KEY ("reviewerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
