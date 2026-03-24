import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { ensureAutomationJobs, formatRelativeRun } from '@/lib/automation';

export async function GET(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user || user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await ensureAutomationJobs(user.companyId);

        const jobs = await (prisma as any).automationJob.findMany({
            where: { companyId: user.companyId ?? null },
            include: {
                runs: {
                    orderBy: { startedAt: 'desc' },
                    take: 1,
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        const recentRuns = await (prisma as any).automationRun.findMany({
            where: { companyId: user.companyId ?? null },
            include: {
                job: {
                    select: { id: true, title: true, action: true },
                },
                triggeredUser: {
                    select: { id: true, name: true, email: true },
                },
            },
            orderBy: { startedAt: 'desc' },
            take: 8,
        });

        return NextResponse.json({
            jobs: jobs.map((job: any) => ({
                ...job,
                lastRunLabel: formatRelativeRun(job.runs[0]?.startedAt || null),
                latestRun: job.runs[0] || null,
            })),
            recentRuns,
        });
    } catch (error: any) {
        console.error('Automation list error:', error);
        return NextResponse.json({ error: error.message || 'Failed to load automation jobs' }, { status: 500 });
    }
}
