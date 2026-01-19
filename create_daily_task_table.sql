-- CreateTable for DailyTaskCompletion
CREATE TABLE IF NOT EXISTS "DailyTaskCompletion" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyTaskCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DailyTaskCompletion_employeeId_idx" ON "DailyTaskCompletion"("employeeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DailyTaskCompletion_taskId_idx" ON "DailyTaskCompletion"("taskId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "DailyTaskCompletion_completedAt_idx" ON "DailyTaskCompletion"("completedAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DailyTaskCompletion_employeeId_taskId_completedAt_key" ON "DailyTaskCompletion"("employeeId", "taskId", "completedAt");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'DailyTaskCompletion_employeeId_fkey'
    ) THEN
        ALTER TABLE "DailyTaskCompletion" ADD CONSTRAINT "DailyTaskCompletion_employeeId_fkey" 
            FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'DailyTaskCompletion_taskId_fkey'
    ) THEN
        ALTER TABLE "DailyTaskCompletion" ADD CONSTRAINT "DailyTaskCompletion_taskId_fkey" 
            FOREIGN KEY ("taskId") REFERENCES "EmployeeTaskTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
