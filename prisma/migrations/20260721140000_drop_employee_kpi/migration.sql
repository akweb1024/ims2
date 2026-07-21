-- Final step of the KRA unification: retire the legacy EmployeeKPI table.
-- KRA truth lives in EmployeeGoal (every KPI was mirrored there by the
-- LEGACY_SYNC bridge and all read/write surfaces are on the goal engine), so
-- these rows are a redundant copy. WorkPlan.linkedKpiId is a plain string
-- column with no FK and is kept as-is.
--
-- DESTRUCTIVE: drops the EmployeeKPI table and EmployeeGoal.kpiId. Run the
-- kra:migrate-legacy script (pre-drop versions) BEFORE deploying this if any
-- environment still has unmigrated KPI rows.

-- Drop the goal -> kpi provenance link
ALTER TABLE "EmployeeGoal" DROP CONSTRAINT IF EXISTS "EmployeeGoal_kpiId_fkey";
ALTER TABLE "EmployeeGoal" DROP COLUMN IF EXISTS "kpiId";

-- Drop the legacy table
DROP TABLE IF EXISTS "EmployeeKPI";
