-- A shift can be marked as the company's default (for employees not explicitly assigned to
-- one), and an employee can be permanently assigned a standing shift, independent of the
-- per-day ShiftRoster. Both feed lateness calculation in resolveEffectiveAttendancePolicy.
-- IF NOT EXISTS keeps this idempotent.
ALTER TABLE "Shift" ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "EmployeeProfile" ADD COLUMN IF NOT EXISTS "shiftId" TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'EmployeeProfile_shiftId_fkey'
    ) THEN
        ALTER TABLE "EmployeeProfile"
            ADD CONSTRAINT "EmployeeProfile_shiftId_fkey"
            FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "EmployeeProfile_shiftId_idx" ON "EmployeeProfile"("shiftId");
