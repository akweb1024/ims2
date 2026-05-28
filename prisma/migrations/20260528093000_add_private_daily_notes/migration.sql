-- CreateTable
CREATE TABLE "PrivateDailyNote" (
    "id" TEXT NOT NULL,
    "creatorUserId" TEXT NOT NULL,
    "companyId" TEXT,
    "noteDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "customCategory" TEXT,
    "sentiment" TEXT NOT NULL DEFAULT 'NEUTRAL',
    "performanceImpactScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PrivateDailyNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivateDailyNoteTag" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrivateDailyNoteTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PrivateDailyNote_creatorUserId_noteDate_idx" ON "PrivateDailyNote"("creatorUserId", "noteDate");

-- CreateIndex
CREATE INDEX "PrivateDailyNote_companyId_idx" ON "PrivateDailyNote"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivateDailyNoteTag_noteId_employeeId_key" ON "PrivateDailyNoteTag"("noteId", "employeeId");

-- CreateIndex
CREATE INDEX "PrivateDailyNoteTag_employeeId_createdAt_idx" ON "PrivateDailyNoteTag"("employeeId", "createdAt");

-- AddForeignKey
ALTER TABLE "PrivateDailyNote" ADD CONSTRAINT "PrivateDailyNote_creatorUserId_fkey" FOREIGN KEY ("creatorUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateDailyNote" ADD CONSTRAINT "PrivateDailyNote_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateDailyNoteTag" ADD CONSTRAINT "PrivateDailyNoteTag_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "PrivateDailyNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivateDailyNoteTag" ADD CONSTRAINT "PrivateDailyNoteTag_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
