-- AlterTable: add document classification + HR verification gate to employee documents
ALTER TABLE "EmployeeDocument" ADD COLUMN     "documentType" TEXT,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT,
ADD COLUMN     "reviewNote" TEXT;

-- CreateIndex
CREATE INDEX "EmployeeDocument_employeeId_idx" ON "EmployeeDocument"("employeeId");
