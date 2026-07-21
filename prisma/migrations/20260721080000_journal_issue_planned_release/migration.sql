-- Add a planned/target release date to JournalIssue so release risk can be
-- assessed against a schedule rather than only completion. Purely additive.

-- AlterTable
ALTER TABLE "JournalIssue" ADD COLUMN     "plannedReleaseAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "JournalIssue_plannedReleaseAt_idx" ON "JournalIssue"("plannedReleaseAt");
