-- Job postings: qualifications text + searchable tags.
-- IF NOT EXISTS keeps this idempotent on environments with prior manual drift.
ALTER TABLE "JobPosting" ADD COLUMN IF NOT EXISTS "qualifications" TEXT;
ALTER TABLE "JobPosting" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
