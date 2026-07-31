-- CreateTable
CREATE TABLE "ReconciliationSignOff" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "signedById" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "toleranceInr" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "declaredGrossInr" DOUBLE PRECISION NOT NULL,
    "declaredNetInr" DOUBLE PRECISION NOT NULL,
    "settledGrossInr" DOUBLE PRECISION NOT NULL,
    "settledNetInr" DOUBLE PRECISION NOT NULL,
    "feeInr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxInr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "inTransitNetInr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "declaredCount" INTEGER NOT NULL DEFAULT 0,
    "settledCount" INTEGER NOT NULL DEFAULT 0,
    "matchedAtSignOff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationSignOff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReconciliationSignOff_companyId_idx" ON "ReconciliationSignOff"("companyId");

-- CreateIndex
CREATE INDEX "ReconciliationSignOff_signedAt_idx" ON "ReconciliationSignOff"("signedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationSignOff_companyId_periodStart_periodEnd_key" ON "ReconciliationSignOff"("companyId", "periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "ReconciliationSignOff" ADD CONSTRAINT "ReconciliationSignOff_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReconciliationSignOff" ADD CONSTRAINT "ReconciliationSignOff_signedById_fkey" FOREIGN KEY ("signedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

