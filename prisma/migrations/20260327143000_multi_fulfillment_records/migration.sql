CREATE TYPE "FulfillmentType" AS ENUM ('PRINT', 'DIGITAL');

ALTER TABLE "DispatchOrder"
ADD COLUMN "fulfillmentType" "FulfillmentType" NOT NULL DEFAULT 'PRINT',
ADD COLUMN "cycleNumber" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "totalCycles" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "cycleLabel" TEXT,
ADD COLUMN "plannedDispatchDate" TIMESTAMP(3),
ADD COLUMN "accessStartDate" TIMESTAMP(3),
ADD COLUMN "accessEndDate" TIMESTAMP(3);

ALTER TABLE "DispatchOrder"
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "state" DROP NOT NULL,
ALTER COLUMN "pincode" DROP NOT NULL,
ALTER COLUMN "country" DROP NOT NULL,
ALTER COLUMN "phone" DROP NOT NULL;

DROP INDEX IF EXISTS "DispatchOrder_invoiceId_key";

CREATE INDEX "DispatchOrder_fulfillmentType_idx" ON "DispatchOrder"("fulfillmentType");
CREATE INDEX "DispatchOrder_plannedDispatchDate_idx" ON "DispatchOrder"("plannedDispatchDate");
CREATE INDEX "DispatchOrder_invoiceId_fulfillmentType_cycleNumber_idx"
ON "DispatchOrder"("invoiceId", "fulfillmentType", "cycleNumber");
