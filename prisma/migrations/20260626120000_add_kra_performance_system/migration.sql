
-- AlterTable
ALTER TABLE "PerformanceMetricDefinition" ADD COLUMN     "aggregation" TEXT DEFAULT 'SUM',
ADD COLUMN     "dataSource" TEXT DEFAULT 'MANUAL',
ADD COLUMN     "department" TEXT,
ADD COLUMN     "sourceType" TEXT;

-- AlterTable
ALTER TABLE "EmployeeGoal" ADD COLUMN     "dataSource" TEXT,
ADD COLUMN     "isKra" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metricId" TEXT,
ADD COLUMN     "templateId" TEXT,
ADD COLUMN     "verifiedValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "weight" DOUBLE PRECISION NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "KraTemplate" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "departmentId" TEXT,
    "designationId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KraTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KraTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "defaultTarget" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "periodType" "GoalType" NOT NULL DEFAULT 'MONTHLY',
    "minThreshold" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KraTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricContribution" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "workReportId" TEXT,
    "reportedValue" DOUBLE PRECISION NOT NULL,
    "verifiedValue" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "sourceRefId" TEXT,
    "pointsValue" DOUBLE PRECISION,
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "note" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceIndex" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "periodType" "GoalType" NOT NULL DEFAULT 'MONTHLY',
    "period" TEXT NOT NULL,
    "achievementScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "attendanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "managerRatingScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "focusScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overallIndex" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "grade" TEXT,
    "weights" JSONB,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceIndex_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KraTemplate_companyId_idx" ON "KraTemplate"("companyId");

-- CreateIndex
CREATE INDEX "KraTemplate_departmentId_idx" ON "KraTemplate"("departmentId");

-- CreateIndex
CREATE INDEX "KraTemplate_designationId_idx" ON "KraTemplate"("designationId");

-- CreateIndex
CREATE INDEX "KraTemplateItem_metricId_idx" ON "KraTemplateItem"("metricId");

-- CreateIndex
CREATE UNIQUE INDEX "KraTemplateItem_templateId_metricId_periodType_key" ON "KraTemplateItem"("templateId", "metricId", "periodType");

-- CreateIndex
CREATE INDEX "MetricContribution_companyId_idx" ON "MetricContribution"("companyId");

-- CreateIndex
CREATE INDEX "MetricContribution_employeeId_metricId_date_idx" ON "MetricContribution"("employeeId", "metricId", "date");

-- CreateIndex
CREATE INDEX "MetricContribution_status_idx" ON "MetricContribution"("status");

-- CreateIndex
CREATE INDEX "MetricContribution_workReportId_idx" ON "MetricContribution"("workReportId");

-- CreateIndex
CREATE INDEX "PerformanceIndex_companyId_idx" ON "PerformanceIndex"("companyId");

-- CreateIndex
CREATE INDEX "PerformanceIndex_employeeId_idx" ON "PerformanceIndex"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "PerformanceIndex_employeeId_periodType_period_key" ON "PerformanceIndex"("employeeId", "periodType", "period");

-- AddForeignKey
ALTER TABLE "EmployeeGoal" ADD CONSTRAINT "EmployeeGoal_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "PerformanceMetricDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KraTemplate" ADD CONSTRAINT "KraTemplate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KraTemplateItem" ADD CONSTRAINT "KraTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "KraTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KraTemplateItem" ADD CONSTRAINT "KraTemplateItem_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "PerformanceMetricDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricContribution" ADD CONSTRAINT "MetricContribution_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricContribution" ADD CONSTRAINT "MetricContribution_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricContribution" ADD CONSTRAINT "MetricContribution_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "PerformanceMetricDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceIndex" ADD CONSTRAINT "PerformanceIndex_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceIndex" ADD CONSTRAINT "PerformanceIndex_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

