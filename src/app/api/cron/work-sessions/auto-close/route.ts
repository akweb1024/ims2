import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateCronRequest } from '@/lib/cron-auth';

/**
 * Auto-close work sessions someone forgot to stop. Any session still running after
 * MAX_HOURS is closed with its duration capped at MAX_HOURS (so a session left open for
 * days doesn't report days of work, and the live board stays honest). Runs every 30 min.
 *
 * Note: an auto-closed session is deliberately NOT rolled into ITProject.actualHours — a
 * forgotten timer is data hygiene, not a genuine logged completion. It still contributes
 * (capped) to the WORK_SESSION_HOURS KRA metric via its stamped durationMinutes.
 */
const MAX_HOURS = 12;

export async function POST(req: NextRequest) {
  const authError = validateCronRequest(req);
  if (authError) return authError;

  try {
    const cutoff = new Date(Date.now() - MAX_HOURS * 3600 * 1000);
    const stale = await prisma.projectWorkSession.findMany({
      where: { endedAt: null, startedAt: { lt: cutoff } },
      select: { id: true, startedAt: true, note: true },
      take: 500,
    });

    for (const s of stale) {
      const endedAt = new Date(s.startedAt.getTime() + MAX_HOURS * 3600 * 1000);
      await prisma.projectWorkSession.update({
        where: { id: s.id },
        data: {
          endedAt,
          durationMinutes: MAX_HOURS * 60,
          note: [s.note, `Auto-closed: exceeded ${MAX_HOURS}h`].filter(Boolean).join(' — '),
        },
      });
    }

    return NextResponse.json({ autoClosed: stale.length });
  } catch (error) {
    console.error('[cron] work-session auto-close failed', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
