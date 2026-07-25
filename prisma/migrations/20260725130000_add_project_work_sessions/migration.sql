-- Project work sessions: an employee "clocks in" on a project (Company or IT), logs
-- activities while running, then clocks out. endedAt IS NULL == running (the live
-- "who's working now" signal). Purely additive: two new tables + their indexes/FKs.

-- CreateTable
CREATE TABLE "ProjectWorkSession" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "itProjectId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectWorkSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectWorkSessionActivity" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectWorkSessionActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectWorkSession_companyId_idx" ON "ProjectWorkSession"("companyId");

-- CreateIndex
CREATE INDEX "ProjectWorkSession_userId_idx" ON "ProjectWorkSession"("userId");

-- CreateIndex
CREATE INDEX "ProjectWorkSession_projectId_idx" ON "ProjectWorkSession"("projectId");

-- CreateIndex
CREATE INDEX "ProjectWorkSession_itProjectId_idx" ON "ProjectWorkSession"("itProjectId");

-- CreateIndex
CREATE INDEX "ProjectWorkSession_endedAt_idx" ON "ProjectWorkSession"("endedAt");

-- CreateIndex
CREATE INDEX "ProjectWorkSession_startedAt_idx" ON "ProjectWorkSession"("startedAt");

-- CreateIndex
CREATE INDEX "ProjectWorkSessionActivity_sessionId_idx" ON "ProjectWorkSessionActivity"("sessionId");

-- AddForeignKey
ALTER TABLE "ProjectWorkSession" ADD CONSTRAINT "ProjectWorkSession_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWorkSession" ADD CONSTRAINT "ProjectWorkSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWorkSession" ADD CONSTRAINT "ProjectWorkSession_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWorkSession" ADD CONSTRAINT "ProjectWorkSession_itProjectId_fkey" FOREIGN KEY ("itProjectId") REFERENCES "ITProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWorkSessionActivity" ADD CONSTRAINT "ProjectWorkSessionActivity_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ProjectWorkSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
