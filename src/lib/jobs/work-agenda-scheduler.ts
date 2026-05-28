import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { generateTodayAgendaForEmployees } from '@/lib/hr/work-agenda-generator';

declare global {
  var __workAgendaSchedulerStarted: boolean | undefined;
  var __workAgendaSchedulerCleanup: (() => void) | undefined;
  var __workAgendaSchedulerLastRunDate: string | undefined;
  var __workAgendaSchedulerLastRunAt: string | undefined;
  var __workAgendaSchedulerLastError: string | undefined;
  var __workAgendaSchedulerLastSummary: { companies: number; generated: number; skipped: number; employees: number } | undefined;
}

const SCHEDULER_TICK_MS = Number(process.env.WORK_AGENDA_SCHEDULER_TICK_MS || 15 * 60 * 1000);
const TARGET_IST_HOUR = Number(process.env.WORK_AGENDA_SCHEDULER_IST_HOUR || 8);
const TARGET_IST_MINUTE = Number(process.env.WORK_AGENDA_SCHEDULER_IST_MINUTE || 0);

const getIstYmdHm = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(new Date());
  const m: Record<string, string> = {};
  for (const p of parts) if (p.type !== 'literal') m[p.type] = p.value;
  return {
    ymd: `${m.year}-${m.month}-${m.day}`,
    hour: Number(m.hour),
    minute: Number(m.minute),
  };
};

export function startWorkAgendaScheduler() {
  if (globalThis.__workAgendaSchedulerStarted) return;
  if (process.env.NODE_ENV !== 'production') return;
  if (process.env.WORK_AGENDA_SCHEDULER === 'false') return;

  globalThis.__workAgendaSchedulerStarted = true;
  let intervalId: NodeJS.Timeout | null = null;

  const tick = async () => {
    try {
      const now = getIstYmdHm();
      if (now.hour < TARGET_IST_HOUR || (now.hour === TARGET_IST_HOUR && now.minute < TARGET_IST_MINUTE)) return;
      if (globalThis.__workAgendaSchedulerLastRunDate === now.ymd) return;

      let totalEmployees = 0;
      let totalGenerated = 0;
      let totalSkipped = 0;
      const companies = await prisma.company.findMany({ select: { id: true, name: true } });
      for (const company of companies) {
        const employees = await prisma.employeeProfile.findMany({
          where: { user: { companyId: company.id, isActive: true } },
          select: { id: true }
        });
        totalEmployees += employees.length;
        const run = await generateTodayAgendaForEmployees({
          companyId: company.id,
          employeeIds: employees.map((e) => e.id),
          generatedBy: 'SYSTEM',
          forceRegenerate: false,
        });
        totalGenerated += run.generated;
        totalSkipped += run.skipped;
      }

      globalThis.__workAgendaSchedulerLastRunDate = now.ymd;
      globalThis.__workAgendaSchedulerLastRunAt = new Date().toISOString();
      globalThis.__workAgendaSchedulerLastError = undefined;
      globalThis.__workAgendaSchedulerLastSummary = {
        companies: companies.length,
        generated: totalGenerated,
        skipped: totalSkipped,
        employees: totalEmployees,
      };
      logger.info('Work agenda scheduler executed', { date: now.ymd, companies: companies.length });
    } catch (error) {
      globalThis.__workAgendaSchedulerLastError = error instanceof Error ? error.message : String(error);
      logger.error('Work agenda scheduler tick failed', error);
    }
  };

  intervalId = setInterval(() => void tick(), SCHEDULER_TICK_MS);
  void tick();

  const cleanup = () => {
    if (intervalId) clearInterval(intervalId);
    globalThis.__workAgendaSchedulerStarted = false;
  };
  globalThis.__workAgendaSchedulerCleanup = cleanup;
  if (typeof process !== 'undefined') {
    process.on('SIGTERM', cleanup);
    process.on('SIGINT', cleanup);
  }

  logger.info('Work agenda scheduler started', {
    tickMs: SCHEDULER_TICK_MS,
    targetIstHour: TARGET_IST_HOUR,
    targetIstMinute: TARGET_IST_MINUTE,
  });
}

export function getWorkAgendaSchedulerStatus() {
  return {
    enabled: process.env.WORK_AGENDA_SCHEDULER !== 'false',
    started: Boolean(globalThis.__workAgendaSchedulerStarted),
    tickMs: SCHEDULER_TICK_MS,
    targetIstHour: TARGET_IST_HOUR,
    targetIstMinute: TARGET_IST_MINUTE,
    lastRunDate: globalThis.__workAgendaSchedulerLastRunDate || null,
    lastRunAt: globalThis.__workAgendaSchedulerLastRunAt || null,
    lastError: globalThis.__workAgendaSchedulerLastError || null,
    lastSummary: globalThis.__workAgendaSchedulerLastSummary || null,
  };
}
