-- AlterTable
ALTER TABLE "User" ADD COLUMN "signatureUrl" TEXT;

-- CreateTable
CREATE TABLE "ReimbursementRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "healthCare" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "travelling" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "mobile" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "internet" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "booksAndPeriodicals" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "employeeSignatureUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReimbursementRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReimbursementRecord_userId_idx" ON "ReimbursementRecord"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReimbursementRecord_userId_month_year_key" ON "ReimbursementRecord"("userId", "month", "year");

-- AddForeignKey
ALTER TABLE "ReimbursementRecord" ADD CONSTRAINT "ReimbursementRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
