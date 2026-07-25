import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateCronRequest } from '@/lib/cron-auth';
import { createNotification } from '@/lib/system-notifications';

/**
 * Overdue support-ticket escalation. Finds open tickets past their SLA `dueAt` that have
 * not been escalated yet, notifies the assignee + the target department head (falling back
 * to the company's IT admins), and stamps `escalatedAt` so each overdue ticket escalates
 * once. Scheduled hourly in src/lib/cron/schedule.ts.
 */
export async function POST(req: NextRequest) {
  const authError = validateCronRequest(req);
  if (authError) return authError;

  try {
    const now = new Date();
    const overdue = await prisma.iTSupportTicket.findMany({
      where: {
        status: { notIn: ['RESOLVED', 'CLOSED'] },
        dueAt: { lt: now }, // a `< now` comparison already excludes NULL dueAt rows
        escalatedAt: null,
      },
      select: {
        id: true,
        title: true,
        companyId: true,
        assignedToId: true,
        department: { select: { headUserId: true } },
      },
      take: 500,
    });

    if (overdue.length === 0) return NextResponse.json({ escalated: 0 });

    // Cache each company's IT admins so a ticket with no assignee/dept-head still reaches someone.
    const itAdminsByCompany = new Map<string, string[]>();
    async function itAdmins(companyId: string): Promise<string[]> {
      if (!itAdminsByCompany.has(companyId)) {
        const admins = await prisma.user.findMany({
          where: { companyId, isActive: true, role: { in: ['IT_MANAGER', 'IT_ADMIN'] } },
          select: { id: true },
        });
        itAdminsByCompany.set(companyId, admins.map((a) => a.id));
      }
      return itAdminsByCompany.get(companyId)!;
    }

    let notified = 0;
    for (const t of overdue) {
      const recipients = new Set<string>([t.assignedToId ?? '', t.department?.headUserId ?? '']);
      recipients.delete('');
      if (recipients.size === 0) (await itAdmins(t.companyId)).forEach((id) => recipients.add(id));

      await Promise.all(
        [...recipients].map((uid) =>
          createNotification({
            userId: uid,
            title: 'Support ticket overdue',
            message: `SLA breached on "${t.title}"`,
            type: 'WARNING',
            link: `/dashboard/support-desk/${t.id}`,
            category: 'GENERAL',
          }).catch(() => {}),
        ),
      );
      notified += recipients.size;
    }

    await prisma.iTSupportTicket.updateMany({
      where: { id: { in: overdue.map((t) => t.id) } },
      data: { escalatedAt: now },
    });

    return NextResponse.json({ escalated: overdue.length, notifications: notified });
  } catch (error) {
    console.error('[cron] support-ticket escalate failed', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
