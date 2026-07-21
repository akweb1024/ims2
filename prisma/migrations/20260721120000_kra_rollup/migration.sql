-- Aggregated KRA outcomes above the employee level (team / department /
-- company), derived from PerformanceIndex + EmployeeGoal by the kra-snapshot
-- cron. Purely additive.

-- CreateTable
CREATE TABLE "KraRollup" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "subjectName" TEXT NOT NULL,
    "periodType" "GoalType" NOT NULL DEFAULT 'MONTHLY',
    "period" TEXT NOT NULL,
    "employeeCount" INTEGER NOT NULL DEFAULT 0,
    "goalCount" INTEGER NOT NULL DEFAULT 0,
    "avgAchievement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgIndex" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gradeCounts" JSONB,
    "dimensionAvgs" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KraRollup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KraRollup_level_subjectId_periodType_period_key" ON "KraRollup"("level", "subjectId", "periodType", "period");

-- CreateIndex
CREATE INDEX "KraRollup_companyId_level_periodType_period_idx" ON "KraRollup"("companyId", "level", "periodType", "period");

-- AddForeignKey
ALTER TABLE "KraRollup" ADD CONSTRAINT "KraRollup_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
