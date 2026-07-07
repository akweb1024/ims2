-- Optional period-start date for manager-assigned tasks, complementing the
-- existing dueDate deadline. IF NOT EXISTS keeps this idempotent.
ALTER TABLE "Task" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
