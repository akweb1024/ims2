-- Link a Company Project (business `Project`, not ITProject) to a KRA metric
-- (PerformanceMetricDefinition). Completing a linked project auto-credits that
-- metric for its manager + lead. Purely additive: one nullable column, its
-- index and FK. Mirrors 20260720120000_add_project_task_kra_link.

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "linkedMetricId" TEXT;

-- CreateIndex
CREATE INDEX "Project_linkedMetricId_idx" ON "Project"("linkedMetricId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_linkedMetricId_fkey" FOREIGN KEY ("linkedMetricId") REFERENCES "PerformanceMetricDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
