import { NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import { getWorkAgendaSchedulerStatus } from '@/lib/jobs/work-agenda-scheduler';

export const GET = authorizedRoute(
  ['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'MANAGER', 'TEAM_LEADER'],
  async () => {
    return NextResponse.json({ success: true, scheduler: getWorkAgendaSchedulerStatus() });
  }
);
