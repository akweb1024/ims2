-- CreateEnum
CREATE TYPE "RevenueChannel" AS ENUM ('BANK_DIRECT', 'RAZORPAY', 'PAYPAL', 'OTHER');

-- CreateEnum
CREATE TYPE "DeclarationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'MATCHED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "SettlementSource" AS ENUM ('BANK_STATEMENT', 'RAZORPAY', 'PAYPAL', 'MANUAL');

-- CreateTable
CREATE TABLE "EmployeeRevenueDeclaration" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "saleDate" TIMESTAMP(3) NOT NULL,
    "customerName" TEXT,
    "reference" TEXT,
    "grossAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "channel" "RevenueChannel" NOT NULL DEFAULT 'BANK_DIRECT',
    "status" "DeclarationStatus" NOT NULL DEFAULT 'SUBMITTED',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeRevenueDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementRecord" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "source" "SettlementSource" NOT NULL,
    "externalRef" TEXT,
    "captureDate" TIMESTAMP(3) NOT NULL,
    "settlementDate" TIMESTAMP(3),
    "originalCurrency" TEXT NOT NULL DEFAULT 'INR',
    "originalAmount" DOUBLE PRECISION NOT NULL,
    "fxRate" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "grossInr" DOUBLE PRECISION NOT NULL,
    "feeInr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "taxInr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netInr" DOUBLE PRECISION NOT NULL,
    "bankReference" TEXT,
    "narration" TEXT,
    "enteredById" TEXT,
    "paymentId" TEXT,
    "declarationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SettlementRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeRevenueDeclaration_companyId_idx" ON "EmployeeRevenueDeclaration"("companyId");

-- CreateIndex
CREATE INDEX "EmployeeRevenueDeclaration_employeeId_idx" ON "EmployeeRevenueDeclaration"("employeeId");

-- CreateIndex
CREATE INDEX "EmployeeRevenueDeclaration_saleDate_idx" ON "EmployeeRevenueDeclaration"("saleDate");

-- CreateIndex
CREATE INDEX "EmployeeRevenueDeclaration_status_idx" ON "EmployeeRevenueDeclaration"("status");

-- CreateIndex
CREATE INDEX "EmployeeRevenueDeclaration_channel_idx" ON "EmployeeRevenueDeclaration"("channel");

-- CreateIndex
CREATE INDEX "SettlementRecord_companyId_idx" ON "SettlementRecord"("companyId");

-- CreateIndex
CREATE INDEX "SettlementRecord_settlementDate_idx" ON "SettlementRecord"("settlementDate");

-- CreateIndex
CREATE INDEX "SettlementRecord_captureDate_idx" ON "SettlementRecord"("captureDate");

-- CreateIndex
CREATE INDEX "SettlementRecord_source_idx" ON "SettlementRecord"("source");

-- CreateIndex
CREATE INDEX "SettlementRecord_declarationId_idx" ON "SettlementRecord"("declarationId");

-- CreateIndex
CREATE UNIQUE INDEX "SettlementRecord_source_externalRef_key" ON "SettlementRecord"("source", "externalRef");

-- AddForeignKey
ALTER TABLE "EmployeeRevenueDeclaration" ADD CONSTRAINT "EmployeeRevenueDeclaration_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeRevenueDeclaration" ADD CONSTRAINT "EmployeeRevenueDeclaration_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementRecord" ADD CONSTRAINT "SettlementRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementRecord" ADD CONSTRAINT "SettlementRecord_enteredById_fkey" FOREIGN KEY ("enteredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementRecord" ADD CONSTRAINT "SettlementRecord_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementRecord" ADD CONSTRAINT "SettlementRecord_declarationId_fkey" FOREIGN KEY ("declarationId") REFERENCES "EmployeeRevenueDeclaration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

