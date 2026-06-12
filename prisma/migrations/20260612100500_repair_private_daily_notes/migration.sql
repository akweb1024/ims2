-- Repair databases where the original private-note migration was marked as
-- applied during baselining without its tables being created.
CREATE TABLE IF NOT EXISTS "PrivateDailyNote" (
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

CREATE TABLE IF NOT EXISTS "PrivateDailyNoteTag" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PrivateDailyNoteTag_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PrivateDailyNote_creatorUserId_noteDate_idx"
    ON "PrivateDailyNote"("creatorUserId", "noteDate");
CREATE INDEX IF NOT EXISTS "PrivateDailyNote_companyId_idx"
    ON "PrivateDailyNote"("companyId");
CREATE UNIQUE INDEX IF NOT EXISTS "PrivateDailyNoteTag_noteId_employeeId_key"
    ON "PrivateDailyNoteTag"("noteId", "employeeId");
CREATE INDEX IF NOT EXISTS "PrivateDailyNoteTag_employeeId_createdAt_idx"
    ON "PrivateDailyNoteTag"("employeeId", "createdAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'PrivateDailyNote_creatorUserId_fkey'
    ) THEN
        ALTER TABLE "PrivateDailyNote"
            ADD CONSTRAINT "PrivateDailyNote_creatorUserId_fkey"
            FOREIGN KEY ("creatorUserId") REFERENCES "User"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'PrivateDailyNote_companyId_fkey'
    ) THEN
        ALTER TABLE "PrivateDailyNote"
            ADD CONSTRAINT "PrivateDailyNote_companyId_fkey"
            FOREIGN KEY ("companyId") REFERENCES "Company"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'PrivateDailyNoteTag_noteId_fkey'
    ) THEN
        ALTER TABLE "PrivateDailyNoteTag"
            ADD CONSTRAINT "PrivateDailyNoteTag_noteId_fkey"
            FOREIGN KEY ("noteId") REFERENCES "PrivateDailyNote"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'PrivateDailyNoteTag_employeeId_fkey'
    ) THEN
        ALTER TABLE "PrivateDailyNoteTag"
            ADD CONSTRAINT "PrivateDailyNoteTag_employeeId_fkey"
            FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
