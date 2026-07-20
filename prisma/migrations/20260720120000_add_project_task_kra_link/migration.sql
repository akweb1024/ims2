-- Link an IT project / task to a KRA metric (PerformanceMetricDefinition).
-- Completing a linked project/task auto-credits that metric for its owner.
-- Purely additive: two nullable columns, their indexes and FKs.

-- AlterTable
ALTER TABLE "ITProject" ADD COLUMN     "linkedMetricId" TEXT;

-- AlterTable
ALTER TABLE "ITTask" ADD COLUMN     "linkedMetricId" TEXT;

-- CreateIndex
CREATE INDEX "ITProject_linkedMetricId_idx" ON "ITProject"("linkedMetricId");

-- CreateIndex
CREATE INDEX "ITTask_linkedMetricId_idx" ON "ITTask"("linkedMetricId");

-- AddForeignKey
ALTER TABLE "ITProject" ADD CONSTRAINT "ITProject_linkedMetricId_fkey" FOREIGN KEY ("linkedMetricId") REFERENCES "PerformanceMetricDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ITTask" ADD CONSTRAINT "ITTask_linkedMetricId_fkey" FOREIGN KEY ("linkedMetricId") REFERENCES "PerformanceMetricDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
