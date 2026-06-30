-- CreateEnum
CREATE TYPE "DepartmentType" AS ENUM ('REVENUE', 'PRODUCTION', 'SUPPORT');

-- AlterTable
ALTER TABLE "Department" ADD COLUMN     "departmentType" "DepartmentType" NOT NULL DEFAULT 'REVENUE';

-- CreateTable
CREATE TABLE "RevenueShareRule" (
    "id" TEXT NOT NULL,
    "beneficiaryDepartmentId" TEXT NOT NULL,
    "sourceCompanyId" TEXT NOT NULL,
    "sourceDepartmentId" TEXT,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueShareRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepartmentRevenueShare" (
    "id" TEXT NOT NULL,
    "revenueTransactionId" TEXT NOT NULL,
    "ruleId" TEXT,
    "sourceCompanyId" TEXT NOT NULL,
    "sourceDepartmentId" TEXT,
    "beneficiaryDepartmentId" TEXT NOT NULL,
    "beneficiaryCompanyId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "isResidual" BOOLEAN NOT NULL DEFAULT false,
    "periodMonth" INTEGER NOT NULL,
    "periodYear" INTEGER NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepartmentRevenueShare_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RevenueShareRule_sourceCompanyId_sourceDepartmentId_isActiv_idx" ON "RevenueShareRule"("sourceCompanyId", "sourceDepartmentId", "isActive");

-- CreateIndex
CREATE INDEX "RevenueShareRule_beneficiaryDepartmentId_idx" ON "RevenueShareRule"("beneficiaryDepartmentId");

-- CreateIndex
CREATE INDEX "DepartmentRevenueShare_beneficiaryDepartmentId_periodYear_p_idx" ON "DepartmentRevenueShare"("beneficiaryDepartmentId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "DepartmentRevenueShare_sourceCompanyId_periodYear_periodMon_idx" ON "DepartmentRevenueShare"("sourceCompanyId", "periodYear", "periodMonth");

-- CreateIndex
CREATE INDEX "DepartmentRevenueShare_revenueTransactionId_idx" ON "DepartmentRevenueShare"("revenueTransactionId");

-- AddForeignKey
ALTER TABLE "RevenueShareRule" ADD CONSTRAINT "RevenueShareRule_beneficiaryDepartmentId_fkey" FOREIGN KEY ("beneficiaryDepartmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueShareRule" ADD CONSTRAINT "RevenueShareRule_sourceCompanyId_fkey" FOREIGN KEY ("sourceCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueShareRule" ADD CONSTRAINT "RevenueShareRule_sourceDepartmentId_fkey" FOREIGN KEY ("sourceDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentRevenueShare" ADD CONSTRAINT "DepartmentRevenueShare_revenueTransactionId_fkey" FOREIGN KEY ("revenueTransactionId") REFERENCES "RevenueTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DepartmentRevenueShare" ADD CONSTRAINT "DepartmentRevenueShare_beneficiaryDepartmentId_fkey" FOREIGN KEY ("beneficiaryDepartmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
