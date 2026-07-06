-- Carry-forward on KRA goals: an unmet OUTPUT target rolls into the next
-- period. baseTargetValue = the period's own recurring target (before carry),
-- carriedInValue = shortfall carried in, sourceGoalId = prior goal (audit).
ALTER TABLE "EmployeeGoal" ADD COLUMN "baseTargetValue" DOUBLE PRECISION;
ALTER TABLE "EmployeeGoal" ADD COLUMN "carriedInValue" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "EmployeeGoal" ADD COLUMN "sourceGoalId" TEXT;
