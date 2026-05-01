-- Phase 1: performance observability contracts and signal events
CREATE TABLE IF NOT EXISTS "PerformanceMetricDefinition" (
  "id" TEXT NOT NULL,
  "companyId" TEXT,
  "scope" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "unit" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "warningThreshold" DOUBLE PRECISION,
  "criticalThreshold" DOUBLE PRECISION,
  "sourceModule" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PerformanceMetricDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PerformanceSignalEvent" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeProfileId" TEXT,
  "metricKey" TEXT NOT NULL,
  "metricScope" TEXT NOT NULL,
  "value" DOUBLE PRECISION NOT NULL,
  "baselineValue" DOUBLE PRECISION,
  "severity" TEXT NOT NULL DEFAULT 'INFO',
  "sourceModule" TEXT NOT NULL,
  "sourceEntityType" TEXT,
  "sourceEntityId" TEXT,
  "context" JSONB,
  "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" TEXT,
  CONSTRAINT "PerformanceSignalEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PerformanceMetricDefinition_companyId_scope_key_key"
  ON "PerformanceMetricDefinition"("companyId", "scope", "key");

CREATE INDEX IF NOT EXISTS "PerformanceMetricDefinition_companyId_scope_idx"
  ON "PerformanceMetricDefinition"("companyId", "scope");

CREATE INDEX IF NOT EXISTS "PerformanceMetricDefinition_isActive_idx"
  ON "PerformanceMetricDefinition"("isActive");

CREATE INDEX IF NOT EXISTS "PerformanceSignalEvent_companyId_metricScope_capturedAt_idx"
  ON "PerformanceSignalEvent"("companyId", "metricScope", "capturedAt");

CREATE INDEX IF NOT EXISTS "PerformanceSignalEvent_metricKey_capturedAt_idx"
  ON "PerformanceSignalEvent"("metricKey", "capturedAt");

CREATE INDEX IF NOT EXISTS "PerformanceSignalEvent_employeeProfileId_capturedAt_idx"
  ON "PerformanceSignalEvent"("employeeProfileId", "capturedAt");

CREATE INDEX IF NOT EXISTS "PerformanceSignalEvent_severity_capturedAt_idx"
  ON "PerformanceSignalEvent"("severity", "capturedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PerformanceMetricDefinition_companyId_fkey'
  ) THEN
    ALTER TABLE "PerformanceMetricDefinition"
      ADD CONSTRAINT "PerformanceMetricDefinition_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PerformanceSignalEvent_companyId_fkey'
  ) THEN
    ALTER TABLE "PerformanceSignalEvent"
      ADD CONSTRAINT "PerformanceSignalEvent_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PerformanceSignalEvent_createdByUserId_fkey'
  ) THEN
    ALTER TABLE "PerformanceSignalEvent"
      ADD CONSTRAINT "PerformanceSignalEvent_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PerformanceSignalEvent_employeeProfileId_fkey'
  ) THEN
    ALTER TABLE "PerformanceSignalEvent"
      ADD CONSTRAINT "PerformanceSignalEvent_employeeProfileId_fkey"
      FOREIGN KEY ("employeeProfileId") REFERENCES "EmployeeProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
