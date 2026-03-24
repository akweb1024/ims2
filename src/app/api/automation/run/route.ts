import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { ensureAutomationJobs } from '@/lib/automation';

async function runAutoReconcile(companyId?: string | null) {
    const latestSession = await (prisma as any).bankReconciliationSession.findFirst({
        where: companyId ? { companyId } : {},
        orderBy: { createdAt: 'desc' },
    });

    const lineWhere = latestSession ? { sessionId: latestSession.id } : undefined;
    const [matched, unmatched, pending] = await Promise.all([
        lineWhere ? (prisma as any).bankReconciliationLine.count({ where: { ...lineWhere, status: 'MATCHED' } }) : 0,
        lineWhere ? (prisma as any).bankReconciliationLine.count({ where: { ...lineWhere, status: 'UNMATCHED' } }) : 0,
        lineWhere ? (prisma as any).bankReconciliationLine.count({ where: { ...lineWhere, status: 'PENDING' } }) : 0,
    ]);

    return {
        message: latestSession
            ? 'Reviewed the most recent reconciliation session and summarized unresolved ledger work.'
            : 'No reconciliation session exists yet. Upload a bank statement to activate this automation.',
        stats: {
            sessionsReviewed: latestSession ? 1 : 0,
            matched,
            unmatched,
            pending,
        },
    };
}

async function runChurnAnalysis(companyId?: string | null) {
    const today = new Date();
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(today.getDate() + 30);

    const where = {
        ...(companyId ? { companyId } : {}),
        status: 'ACTIVE',
    } as any;

    const [active, expiringSoon, overdueComms] = await Promise.all([
        prisma.subscription.count({ where }),
        prisma.subscription.count({
            where: {
                ...where,
                endDate: {
                    gte: today,
                    lte: thirtyDaysAhead,
                },
            },
        }),
        prisma.communicationLog.count({
            where: {
                ...(companyId ? { companyId } : {}),
                nextFollowUpDate: { lt: today },
                isFollowUpCompleted: false,
            },
        }),
    ]);

    const atRisk = expiringSoon + overdueComms;
    return {
        message: atRisk > 0
            ? `Identified ${atRisk} customer signals that need retention attention.`
            : 'No immediate churn signals detected in active subscriptions and customer follow-ups.',
        stats: {
            analyzed: active,
            expiringSoon,
            overdueFollowUps: overdueComms,
            atRisk,
        },
    };
}

async function runGithubSync(companyId?: string | null) {
    const [projects, invoices] = await Promise.all([
        prisma.project.count({ where: companyId ? { companyId } : {} }),
        prisma.invoice.count({ where: companyId ? { companyId } : {} }),
    ]);

    return {
        message: 'GitHub sync is not connected yet. This check confirmed the local delivery/billing dataset and is ready for a future SCM integration.',
        stats: {
            projects,
            invoices,
            reposConnected: 0,
        },
    };
}

export async function POST(req: NextRequest) {
    try {
        const user = await getSessionUser();
        if (!user || user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        await ensureAutomationJobs(user.companyId);

        const { action } = await req.json();
        const job = await (prisma as any).automationJob.findFirst({
            where: {
                companyId: user.companyId ?? null,
                action,
                isActive: true,
            },
        });

        if (!job) {
            return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
        }

        const startedAt = Date.now();
        const runRecord = await (prisma as any).automationRun.create({
            data: {
                jobId: job.id,
                companyId: user.companyId ?? null,
                triggeredBy: user.id,
                status: 'RUNNING',
            },
        });

        let result: { message: string; stats: Record<string, number> };

        try {
            switch (action) {
                case 'AUTO_RECONCILE':
                    result = await runAutoReconcile(user.companyId);
                    break;
                case 'CHURN_ANALYSIS':
                    result = await runChurnAnalysis(user.companyId);
                    break;
                case 'GITHUB_SYNC':
                    result = await runGithubSync(user.companyId);
                    break;
                default:
                    throw new Error('Invalid action');
            }

            const completedAt = new Date();
            await (prisma as any).automationRun.update({
                where: { id: runRecord.id },
                data: {
                    status: 'SUCCESS',
                    completedAt,
                    durationMs: Date.now() - startedAt,
                    message: result.message,
                    stats: result.stats,
                },
            });

            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'run',
                    entity: 'automation',
                    entityId: job.id,
                    changes: {
                        action,
                        status: 'SUCCESS',
                        stats: result.stats,
                    },
                },
            });

            return NextResponse.json({
                success: true,
                message: result.message,
                stats: result.stats,
                runId: runRecord.id,
            });
        } catch (error: any) {
            await (prisma as any).automationRun.update({
                where: { id: runRecord.id },
                data: {
                    status: 'FAILED',
                    completedAt: new Date(),
                    durationMs: Date.now() - startedAt,
                    error: error.message || 'Automation failed',
                },
            });

            return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
        }
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
