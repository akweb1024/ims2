-- CreateTable
CREATE TABLE "DashboardWidgetCatalog" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "supportedScopes" TEXT[] NOT NULL DEFAULT ARRAY['TEAM','INDIVIDUAL']::TEXT[],
    "defaultSize" TEXT NOT NULL DEFAULT 'MD',
    "defaultOrder" INTEGER NOT NULL DEFAULT 0,
    "configSchema" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardWidgetCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardWidgetPolicy" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "widgetKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "allowedRoles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "allowedUserIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "defaultVisible" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "minRole" TEXT,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardWidgetPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardLayoutPreference" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "userId" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "selectedScope" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
    "layoutVersion" INTEGER NOT NULL DEFAULT 1,
    "widgetOrder" JSONB NOT NULL,
    "widgetVisibility" JSONB NOT NULL,
    "widgetConfig" JSONB,
    "isDefaultForRole" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardLayoutPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardRoleDefault" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "role" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "widgetOrder" JSONB NOT NULL,
    "widgetVisibility" JSONB NOT NULL,
    "widgetConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardRoleDefault_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendancePolicy" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "lateCheckInTime" TEXT NOT NULL DEFAULT '09:30',
    "shortLeaveTime" TEXT NOT NULL DEFAULT '10:30',
    "graceMinutes" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyAttendancePolicy" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "lateCheckInTime" TEXT NOT NULL DEFAULT '09:30',
    "shortLeaveTime" TEXT NOT NULL DEFAULT '10:30',
    "graceMinutes" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyAttendancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAttendancePolicyOverride" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "companyId" TEXT,
    "timezone" TEXT DEFAULT 'Asia/Kolkata',
    "lateCheckInTime" TEXT,
    "shortLeaveTime" TEXT,
    "graceMinutes" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployeeAttendancePolicyOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DashboardWidgetCatalog_key_key" ON "DashboardWidgetCatalog"("key");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardWidgetPolicy_companyId_widgetKey_scope_key" ON "DashboardWidgetPolicy"("companyId", "widgetKey", "scope");

-- CreateIndex
CREATE INDEX "DashboardWidgetPolicy_companyId_idx" ON "DashboardWidgetPolicy"("companyId");

-- CreateIndex
CREATE INDEX "DashboardWidgetPolicy_widgetKey_idx" ON "DashboardWidgetPolicy"("widgetKey");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardLayoutPreference_userId_context_key" ON "DashboardLayoutPreference"("userId", "context");

-- CreateIndex
CREATE INDEX "DashboardLayoutPreference_companyId_idx" ON "DashboardLayoutPreference"("companyId");

-- CreateIndex
CREATE INDEX "DashboardLayoutPreference_context_idx" ON "DashboardLayoutPreference"("context");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardRoleDefault_companyId_role_context_key" ON "DashboardRoleDefault"("companyId", "role", "context");

-- CreateIndex
CREATE INDEX "DashboardRoleDefault_companyId_idx" ON "DashboardRoleDefault"("companyId");

-- CreateIndex
CREATE INDEX "DashboardRoleDefault_role_idx" ON "DashboardRoleDefault"("role");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyAttendancePolicy_companyId_key" ON "CompanyAttendancePolicy"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeAttendancePolicyOverride_employeeId_key" ON "EmployeeAttendancePolicyOverride"("employeeId");

-- AddForeignKey
ALTER TABLE "DashboardWidgetPolicy" ADD CONSTRAINT "DashboardWidgetPolicy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardLayoutPreference" ADD CONSTRAINT "DashboardLayoutPreference_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardLayoutPreference" ADD CONSTRAINT "DashboardLayoutPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardRoleDefault" ADD CONSTRAINT "DashboardRoleDefault_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyAttendancePolicy" ADD CONSTRAINT "CompanyAttendancePolicy_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAttendancePolicyOverride" ADD CONSTRAINT "EmployeeAttendancePolicyOverride_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeAttendancePolicyOverride" ADD CONSTRAINT "EmployeeAttendancePolicyOverride_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "EmployeeProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
