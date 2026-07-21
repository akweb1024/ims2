-- Catch-up migration: reconcile schema objects that reached some environments
-- via `prisma db push` but were never captured as migration files. Without this,
-- a database provisioned purely by `prisma migrate deploy` (CI, a fresh prod)
-- diverges from schema.prisma.
--
-- Most importantly it restores EmployeeGoal.dimension / dailyTarget /
-- assignedById / dueDate and the KraDimension enum. The KRA goal-rollup
-- (rollupGoalsForMetric) writes EmployeeGoal via Prisma, whose generated SQL
-- references every mapped column; when these are absent it throws P2022 and the
-- rollup silently fails -- so both the IT project/task and the new publication
-- auto-credit write their MetricContribution but never move the goal value.
--
-- Every statement is idempotent (guarded CREATE, IF NOT EXISTS, IF EXISTS) so
-- this is a safe no-op on databases that already have these objects.

-- CreateEnum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KraDimension') THEN
    CREATE TYPE "KraDimension" AS ENUM ('OUTPUT', 'QUALITY', 'TAT', 'COLLABORATION', 'IMPROVEMENT', 'BEHAVIOR');
  END IF;
END $$;

-- AlterEnum
ALTER TYPE "GoalType" ADD VALUE IF NOT EXISTS 'DAILY';
ALTER TYPE "GoalType" ADD VALUE IF NOT EXISTS 'WEEKLY';

-- DropIndex
DROP INDEX IF EXISTS "EmployeeProfile_shiftId_idx";

-- AlterTable
ALTER TABLE "DashboardWidgetCatalog" ALTER COLUMN "defaultSize" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Designation" ADD COLUMN IF NOT EXISTS "gradeId" TEXT;

-- AlterTable
ALTER TABLE "EmployeeGoal"
  ADD COLUMN IF NOT EXISTS "assignedById" TEXT,
  ADD COLUMN IF NOT EXISTS "dailyTarget" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "dimension" "KraDimension",
  ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "EmployeeProfile" ADD COLUMN IF NOT EXISTS "gradeId" TEXT;

-- AlterTable
ALTER TABLE "KraTemplateItem" ADD COLUMN IF NOT EXISTS "dimension" "KraDimension" NOT NULL DEFAULT 'OUTPUT';

-- AlterTable
ALTER TABLE "PerformanceIndex"
  ADD COLUMN IF NOT EXISTS "hrModeration" TEXT,
  ADD COLUMN IF NOT EXISTS "kraAchievement" JSONB,
  ADD COLUMN IF NOT EXISTS "letterRating" TEXT,
  ADD COLUMN IF NOT EXISTS "managerComments" TEXT,
  ADD COLUMN IF NOT EXISTS "raterId" TEXT,
  ADD COLUMN IF NOT EXISTS "ratingStatus" TEXT NOT NULL DEFAULT 'SUBMITTED';

-- AlterTable
ALTER TABLE "RevenueTransaction" ADD COLUMN IF NOT EXISTS "metricContributionId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Grade" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "minCtc" DOUBLE PRECISION,
    "midCtc" DOUBLE PRECISION,
    "maxCtc" DOUBLE PRECISION,
    "noticeDays" INTEGER,
    "typicalExperience" TEXT,
    "decisionRights" TEXT,
    "incrementMinPct" DOUBLE PRECISION,
    "incrementMaxPct" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DigitalTwinDepartmentConfig" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "departmentId" TEXT,
    "departmentName" TEXT,
    "scoringWeights" JSONB NOT NULL,
    "riskThresholdHigh" INTEGER NOT NULL DEFAULT 65,
    "riskThresholdMedium" INTEGER NOT NULL DEFAULT 35,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalTwinDepartmentConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DigitalTwinFollowUp" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "departmentId" TEXT,
    "employeeId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "questionCategory" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "actionPlan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "outcome" TEXT,
    "outcomeRating" INTEGER,
    "dueDate" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "signalSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigitalTwinFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "GoalVerification" (
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
CREATE TABLE IF NOT EXISTS "Proof" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Proof_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Grade_companyId_idx" ON "Grade"("companyId");
CREATE UNIQUE INDEX IF NOT EXISTS "Grade_companyId_code_key" ON "Grade"("companyId", "code");
CREATE INDEX IF NOT EXISTS "DigitalTwinDepartmentConfig_companyId_idx" ON "DigitalTwinDepartmentConfig"("companyId");
CREATE INDEX IF NOT EXISTS "DigitalTwinDepartmentConfig_departmentId_idx" ON "DigitalTwinDepartmentConfig"("departmentId");
CREATE UNIQUE INDEX IF NOT EXISTS "DigitalTwinDepartmentConfig_companyId_departmentId_key" ON "DigitalTwinDepartmentConfig"("companyId", "departmentId");
CREATE INDEX IF NOT EXISTS "DigitalTwinFollowUp_companyId_idx" ON "DigitalTwinFollowUp"("companyId");
CREATE INDEX IF NOT EXISTS "DigitalTwinFollowUp_departmentId_idx" ON "DigitalTwinFollowUp"("departmentId");
CREATE INDEX IF NOT EXISTS "DigitalTwinFollowUp_employeeId_idx" ON "DigitalTwinFollowUp"("employeeId");
CREATE INDEX IF NOT EXISTS "DigitalTwinFollowUp_managerId_idx" ON "DigitalTwinFollowUp"("managerId");
CREATE INDEX IF NOT EXISTS "DigitalTwinFollowUp_status_idx" ON "DigitalTwinFollowUp"("status");
CREATE INDEX IF NOT EXISTS "DigitalTwinFollowUp_createdAt_idx" ON "DigitalTwinFollowUp"("createdAt");
CREATE INDEX IF NOT EXISTS "GoalVerification_goalId_idx" ON "GoalVerification"("goalId");
CREATE INDEX IF NOT EXISTS "GoalVerification_verifierId_idx" ON "GoalVerification"("verifierId");
CREATE INDEX IF NOT EXISTS "Proof_goalId_idx" ON "Proof"("goalId");
CREATE INDEX IF NOT EXISTS "RevenueTransaction_metricContributionId_idx" ON "RevenueTransaction"("metricContributionId");

-- AddForeignKey (guarded: constraints have no IF NOT EXISTS)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Designation_gradeId_fkey') THEN
    ALTER TABLE "Designation" ADD CONSTRAINT "Designation_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Grade_companyId_fkey') THEN
    ALTER TABLE "Grade" ADD CONSTRAINT "Grade_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeProfile_gradeId_fkey') THEN
    ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RevenueTransaction_metricContributionId_fkey') THEN
    ALTER TABLE "RevenueTransaction" ADD CONSTRAINT "RevenueTransaction_metricContributionId_fkey" FOREIGN KEY ("metricContributionId") REFERENCES "MetricContribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'GoalVerification_goalId_fkey') THEN
    ALTER TABLE "GoalVerification" ADD CONSTRAINT "GoalVerification_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "EmployeeGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Proof_goalId_fkey') THEN
    ALTER TABLE "Proof" ADD CONSTRAINT "Proof_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "EmployeeGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
