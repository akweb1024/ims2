-- Hot-path indexes (2026-07 data-model review).
-- IF NOT EXISTS keeps this idempotent on environments with prior manual drift.

-- Multi-tenant tables queried by companyId with no leading companyId index
CREATE INDEX IF NOT EXISTS "CompanyAttendancePolicy_companyId_idx" ON "CompanyAttendancePolicy"("companyId");
CREATE INDEX IF NOT EXISTS "EmployeeAttendancePolicyOverride_companyId_idx" ON "EmployeeAttendancePolicyOverride"("companyId");
CREATE INDEX IF NOT EXISTS "StatutoryConfig_companyId_idx" ON "StatutoryConfig"("companyId");
CREATE INDEX IF NOT EXISTS "JobPosting_companyId_idx" ON "JobPosting"("companyId");
CREATE INDEX IF NOT EXISTS "Conference_companyId_idx" ON "Conference"("companyId");
CREATE INDEX IF NOT EXISTS "Course_companyId_idx" ON "Course"("companyId");
CREATE INDEX IF NOT EXISTS "Workshop_companyId_idx" ON "Workshop"("companyId");
CREATE INDEX IF NOT EXISTS "Internship_companyId_idx" ON "Internship"("companyId");
CREATE INDEX IF NOT EXISTS "IncentiveSchema_companyId_idx" ON "IncentiveSchema"("companyId");
CREATE INDEX IF NOT EXISTS "BonusSchema_companyId_idx" ON "BonusSchema"("companyId");
CREATE INDEX IF NOT EXISTS "CompanyPotential_companyId_idx" ON "CompanyPotential"("companyId");
CREATE INDEX IF NOT EXISTS "WebsiteMonitor_companyId_idx" ON "WebsiteMonitor"("companyId");
CREATE INDEX IF NOT EXISTS "ScreeningTemplate_companyId_idx" ON "ScreeningTemplate"("companyId");
CREATE INDEX IF NOT EXISTS "ThinkTankIdeaVote_companyId_idx" ON "ThinkTankIdeaVote"("companyId");

-- Hot query paths
CREATE INDEX IF NOT EXISTS "LeaveRequest_employeeId_idx" ON "LeaveRequest"("employeeId");
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");
CREATE INDEX IF NOT EXISTS "ChatMessage_roomId_createdAt_idx" ON "ChatMessage"("roomId", "createdAt");
CREATE INDEX IF NOT EXISTS "Invoice_lmsParticipantId_idx" ON "Invoice"("lmsParticipantId");
