-- ============================================================
-- FIX: CustomerType enum migration + designation column type
-- Run this BEFORE: prisma db push --accept-data-loss
-- ============================================================

-- STEP 1: Add ORGANIZATION to CustomerType if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'CustomerType' AND e.enumlabel = 'ORGANIZATION'
  ) THEN
    ALTER TYPE "CustomerType" ADD VALUE 'ORGANIZATION';
  END IF;
END $$;

-- STEP 2: Migrate old INSTITUTION rows → ORGANIZATION
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'CustomerType' AND e.enumlabel = 'INSTITUTION'
  ) THEN
    UPDATE "CustomerProfile"
    SET "customerType" = 'ORGANIZATION'::"CustomerType"
    WHERE "customerType"::text = 'INSTITUTION';
  END IF;
END $$;

-- STEP 3: Migrate old AGENCY rows → ORGANIZATION
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'CustomerType' AND e.enumlabel = 'AGENCY'
  ) THEN
    UPDATE "CustomerProfile"
    SET "customerType" = 'ORGANIZATION'::"CustomerType"
    WHERE "customerType"::text = 'AGENCY';
  END IF;
END $$;

-- STEP 4: Fix designation column — if it's an enum type, cast it to text
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT udt_name INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'CustomerProfile' AND column_name = 'designation';
  
  IF col_type != 'text' AND col_type != 'varchar' THEN
    -- Column is an enum, convert to text preserving values
    ALTER TABLE "CustomerProfile"
      ALTER COLUMN "designation" TYPE TEXT USING "designation"::text;
  END IF;
END $$;

-- ============================================================
-- Verify results
-- ============================================================
SELECT 'CustomerType values:' as info, "customerType"::text, COUNT(*) 
FROM "CustomerProfile" GROUP BY "customerType"::text;

SELECT 'designation column type:' as info, data_type, udt_name
FROM information_schema.columns 
WHERE table_name = 'CustomerProfile' AND column_name = 'designation';
