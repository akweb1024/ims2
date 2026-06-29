-- CreateEnum
CREATE TYPE "KraDimension" AS ENUM ('OUTPUT', 'QUALITY', 'TAT', 'COLLABORATION', 'IMPROVEMENT', 'BEHAVIOR');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "GoalType" ADD VALUE 'DAILY';
ALTER TYPE "GoalType" ADD VALUE 'WEEKLY';

-- AlterTable
ALTER TABLE "EmployeeGoal" ADD COLUMN     "assignedById" TEXT,
ADD COLUMN     "dailyTarget" DOUBLE PRECISION,
ADD COLUMN     "dimension" "KraDimension",
ADD COLUMN     "dueDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "KraTemplateItem" ADD COLUMN     "dimension" "KraDimension" NOT NULL DEFAULT 'OUTPUT';

-- AlterTable
ALTER TABLE "PerformanceIndex" ADD COLUMN     "hrModeration" TEXT,
ADD COLUMN     "kraAchievement" JSONB,
ADD COLUMN     "letterRating" TEXT,
ADD COLUMN     "managerComments" TEXT,
ADD COLUMN     "raterId" TEXT,
ADD COLUMN     "ratingStatus" TEXT NOT NULL DEFAULT 'SUBMITTED';

-- AlterTable
ALTER TABLE "RevenueTransaction" ADD COLUMN     "metricContributionId" TEXT;

-- CreateTable
CREATE TABLE "GoalVerification" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "verifierId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GoalVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proof" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proof_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GoalVerification_goalId_idx" ON "GoalVerification"("goalId");

-- CreateIndex
CREATE INDEX "GoalVerification_verifierId_idx" ON "GoalVerification"("verifierId");

-- CreateIndex
CREATE INDEX "Proof_goalId_idx" ON "Proof"("goalId");

-- CreateIndex
CREATE INDEX "RevenueTransaction_metricContributionId_idx" ON "RevenueTransaction"("metricContributionId");

-- AddForeignKey
ALTER TABLE "RevenueTransaction" ADD CONSTRAINT "RevenueTransaction_metricContributionId_fkey" FOREIGN KEY ("metricContributionId") REFERENCES "MetricContribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GoalVerification" ADD CONSTRAINT "GoalVerification_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "EmployeeGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proof" ADD CONSTRAINT "Proof_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "EmployeeGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

