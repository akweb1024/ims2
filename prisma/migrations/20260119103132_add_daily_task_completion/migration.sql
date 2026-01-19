-- CreateTable
CREATE TABLE "DailyTaskCompletion" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyTaskCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyTaskCompletion_employeeId_idx" ON "DailyTaskCompletion"("employeeId");

-- CreateIndex
CREATE INDEX "DailyTaskCompletion_taskId_idx" ON "DailyTaskCompletion"("taskId");

-- CreateIndex
CREATE INDEX "DailyTaskCompletion_completedAt_idx" ON "DailyTaskCompletion"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DailyTaskCompletion_employeeId_taskId_completedAt_key" ON "DailyTaskCompletion"("employeeId", "taskId", "completedAt");

-- AddForeignKey
ALTER TABLE "DailyTaskCompletion" ADD CONSTRAINT "DailyTaskCompletion_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyTaskCompletion" ADD CONSTRAINT "DailyTaskCompletion_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "EmployeeTaskTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
