-- Retire the IT service catalogue.
--
-- The service desk (/dashboard/service-desk) let an employee pick a priced entry from
-- ITServiceDefinition and raise an ITTask against it. It sat one nav line from Support Desk,
-- which already routes a request to any department including IT, and is being removed as a
-- duplicate way to ask IT for something.
--
-- What this does NOT touch: the ITTask rows themselves. Tasks of type SERVICE_REQUEST are
-- ordinary IT task-board records carrying revenue and analytics history; they keep working,
-- they simply lose their catalogue link. The TaskType.SERVICE_REQUEST enum value also stays,
-- because the task board, both task forms and the IT analytics dashboard all still use it.
--
-- This is destructive and irreversible: ITServiceDefinition rows and the ITTask -> service
-- mapping are gone once it runs. It executes automatically on boot
-- (RUN_MIGRATIONS_ON_START=true). To see what is about to be lost, run this first:
--
--   SELECT count(*) AS catalogue_entries FROM "ITServiceDefinition";
--   SELECT count(*) AS linked_tasks FROM "ITTask" WHERE "serviceId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "ITServiceDefinition" DROP CONSTRAINT "ITServiceDefinition_companyId_fkey";

-- DropForeignKey
ALTER TABLE "ITTask" DROP CONSTRAINT "ITTask_serviceId_fkey";

-- AlterTable
ALTER TABLE "ITTask" DROP COLUMN "serviceId";

-- DropTable
DROP TABLE "ITServiceDefinition";
