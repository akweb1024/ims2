-- SLA fields for support tickets: a due time and a last-escalated marker so the overdue
-- escalation cron notifies once rather than every run. Purely additive.

-- AlterTable
ALTER TABLE "ITSupportTicket" ADD COLUMN     "dueAt" TIMESTAMP(3);
ALTER TABLE "ITSupportTicket" ADD COLUMN     "escalatedAt" TIMESTAMP(3);
