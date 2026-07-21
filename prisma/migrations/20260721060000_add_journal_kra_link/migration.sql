-- Link a Journal to a KRA metric (PerformanceMetricDefinition).
-- Publishing an article in the journal auto-credits that metric to the
-- journal manager. Mirrors the ITProject/ITTask linkedMetricId flow.
-- Purely additive: one nullable column, its index and FK.

-- AlterTable
ALTER TABLE "Journal" ADD COLUMN     "linkedMetricId" TEXT;

-- CreateIndex
CREATE INDEX "Journal_linkedMetricId_idx" ON "Journal"("linkedMetricId");

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_linkedMetricId_fkey" FOREIGN KEY ("linkedMetricId") REFERENCES "PerformanceMetricDefinition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
