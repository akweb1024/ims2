-- Optional per-day pace target on KRA template items, carried into
-- EmployeeGoal.dailyTarget when the template is assigned.
ALTER TABLE "KraTemplateItem" ADD COLUMN "dailyTarget" DOUBLE PRECISION;
