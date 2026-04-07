-- AlterTable: Add zoneCode to CustomerProfile
ALTER TABLE "public"."CustomerProfile" ADD COLUMN IF NOT EXISTS "zoneCode" TEXT;

-- AlterTable: Add zoneCode to Institution
ALTER TABLE "public"."Institution" ADD COLUMN IF NOT EXISTS "zoneCode" TEXT;
