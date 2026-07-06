-- JobPosting.companyId becomes optional so jobs can be posted globally
-- (not tied to any single company). Existing rows keep their company.
ALTER TABLE "JobPosting" ALTER COLUMN "companyId" DROP NOT NULL;
