-- Dispatch tracking upgrade: invoice/customer-linked operational shipment fields

ALTER TABLE "DispatchOrder"
ADD COLUMN "customerProfileId" TEXT,
ADD COLUMN "partnerName" TEXT,
ADD COLUMN "remarks" TEXT,
ADD COLUMN "packedDate" TIMESTAMP(3),
ADD COLUMN "createdByUserId" TEXT,
ADD COLUMN "updatedByUserId" TEXT;

ALTER TABLE "DispatchOrder"
ADD CONSTRAINT "DispatchOrder_invoiceId_fkey"
FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DispatchOrder"
ADD CONSTRAINT "DispatchOrder_customerProfileId_fkey"
FOREIGN KEY ("customerProfileId") REFERENCES "CustomerProfile"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DispatchOrder"
ADD CONSTRAINT "DispatchOrder_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DispatchOrder"
ADD CONSTRAINT "DispatchOrder_updatedByUserId_fkey"
FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "DispatchOrder_customerProfileId_idx" ON "DispatchOrder"("customerProfileId");
CREATE INDEX "DispatchOrder_invoiceId_idx" ON "DispatchOrder"("invoiceId");
CREATE UNIQUE INDEX "DispatchOrder_invoiceId_key" ON "DispatchOrder"("invoiceId");
