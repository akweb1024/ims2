ALTER TABLE "CustomerProfile"
ADD COLUMN "sharedCompanyIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
