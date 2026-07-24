-- AlterTable: probation tracking on the employee profile
ALTER TABLE "EmployeeProfile" ADD COLUMN     "probationEndDate" TIMESTAMP(3),
ADD COLUMN     "employmentStatus" TEXT NOT NULL DEFAULT 'PROBATION';

-- Existing employees predate this feature and are already past onboarding —
-- treat them as CONFIRMED so the reminder job never flags tenured staff. The
-- column default keeps NEW hires on PROBATION.
UPDATE "EmployeeProfile" SET "employmentStatus" = 'CONFIRMED';

-- CreateTable
CREATE TABLE "ConfirmationReview" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "probationEndDate" TIMESTAMP(3),
    "kraSnapshot" JSONB,
    "managerRecommendation" TEXT,
    "managerNote" TEXT,
    "recommendedById" TEXT,
    "recommendedAt" TIMESTAMP(3),
    "hrDecision" TEXT,
    "hrNote" TEXT,
    "decidedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "newProbationEndDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfirmationReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConfirmationReview_employeeId_idx" ON "ConfirmationReview"("employeeId");

-- CreateIndex
CREATE INDEX "ConfirmationReview_status_idx" ON "ConfirmationReview"("status");

-- AddForeignKey
ALTER TABLE "ConfirmationReview" ADD CONSTRAINT "ConfirmationReview_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
