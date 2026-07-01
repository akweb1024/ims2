-- AlterTable
ALTER TABLE "Designation" ADD COLUMN     "gradeId" TEXT;

-- AlterTable
ALTER TABLE "EmployeeProfile" ADD COLUMN     "gradeId" TEXT;

-- CreateTable
CREATE TABLE "Grade" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "minCtc" DOUBLE PRECISION,
    "midCtc" DOUBLE PRECISION,
    "maxCtc" DOUBLE PRECISION,
    "noticeDays" INTEGER,
    "typicalExperience" TEXT,
    "decisionRights" TEXT,
    "incrementMinPct" DOUBLE PRECISION,
    "incrementMaxPct" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Grade_companyId_idx" ON "Grade"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_companyId_code_key" ON "Grade"("companyId", "code");

-- AddForeignKey
ALTER TABLE "Designation" ADD CONSTRAINT "Designation_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeProfile" ADD CONSTRAINT "EmployeeProfile_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

