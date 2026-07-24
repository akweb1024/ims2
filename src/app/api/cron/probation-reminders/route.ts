import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateCronRequest } from '@/lib/cron-auth';
import { createNotification } from '@/lib/system-notifications';
import { buildKraSnapshot, effectiveProbationEnd, REMINDER_WINDOW_DAYS, OPEN_REVIEW_STATUSES } from '@/lib/hr/confirmation';

export const dynamic = 'force-dynamic';

// GET /api/cron/probation-reminders
// Opens a confirmation review (and pings the manager) for every employee still
// on probation whose probation ends within the reminder window. Idempotent — an
// employee with an already-open review is skipped, so re-runs never duplicate.
export async function GET(req: NextRequest) {
    try {
        const authError = validateCronRequest(req);
        if (authError) return authError;

        const now = new Date();
        const threshold = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000);

        // Probation length varies (explicit date vs joining+90d), so filter the
        // effective end in JS — the probation cohort is small.
        const candidates = await prisma.employeeProfile.findMany({
            where: {
                employmentStatus: 'PROBATION',
                user: { isActive: true },
                dateOfJoining: { not: null },
            },
            select: {
                id: true,
                probationEndDate: true,
                dateOfJoining: true,
                user: { select: { id: true, name: true, managerId: true } },
            },
        });

        let created = 0;
        let notified = 0;

        for (const emp of candidates) {
            const end = effectiveProbationEnd(emp);
            if (!end || end > threshold) continue;

            const open = await prisma.confirmationReview.findFirst({
                where: { employeeId: emp.id, status: { in: OPEN_REVIEW_STATUSES } },
                select: { id: true },
            });
            if (open) continue;

            await prisma.confirmationReview.create({
                data: {
                    employeeId: emp.id,
                    status: 'PENDING',
                    probationEndDate: end,
                    kraSnapshot: await buildKraSnapshot(emp.id),
                },
            });
            created += 1;

            if (emp.user?.managerId) {
                try {
                    await createNotification({
                        userId: emp.user.managerId,
                        title: 'Probation review due',
                        message: `${emp.user.name || 'An employee'}'s probation ends on ${end.toISOString().slice(0, 10)}. Please submit a confirmation recommendation.`,
                        type: 'WARNING',
                        channels: ['IN_APP'],
                        category: 'ONBOARDING',
                        link: '/dashboard/hr-management/confirmations',
                    });
                    notified += 1;
                } catch (err) {
                    console.error('Probation reminder notification failed:', err);
                }
            }
        }

        return NextResponse.json({ success: true, candidates: candidates.length, created, notified });
    } catch (error) {
        console.error('probation-reminders cron error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
