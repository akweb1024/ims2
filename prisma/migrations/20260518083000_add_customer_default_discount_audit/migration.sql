ALTER TABLE "CustomerProfile"
ADD COLUMN "defaultDiscountType" TEXT DEFAULT 'PERCENTAGE',
ADD COLUMN "defaultDiscountValue" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN "discountUpdatedAt" TIMESTAMP(3),
ADD COLUMN "discountUpdatedById" TEXT;

CREATE INDEX "CustomerProfile_discountUpdatedById_idx" ON "CustomerProfile"("discountUpdatedById");

ALTER TABLE "CustomerProfile"
ADD CONSTRAINT "CustomerProfile_discountUpdatedById_fkey"
FOREIGN KEY ("discountUpdatedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
