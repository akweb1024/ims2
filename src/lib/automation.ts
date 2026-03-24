import { prisma } from '@/lib/prisma';

export const DEFAULT_AUTOMATION_JOBS = [
    {
        key: 'finance-reconcile',
        action: 'AUTO_RECONCILE',
        title: 'Auto-Reconciliation Engine',
        description: 'Analyzes saved reconciliation sessions and highlights unresolved ledger matches.',
        icon: 'DollarSign',
        color: 'bg-emerald-50 text-emerald-600',
        category: 'Finance',
        scheduleLabel: 'On demand / Daily review',
    },
    {
        key: 'churn-analysis',
        action: 'CHURN_ANALYSIS',
        title: 'Customer Churn Predictor',
        description: 'Flags subscription accounts that are nearing expiry or showing weak engagement signals.',
        icon: 'Users',
        color: 'bg-rose-50 text-rose-600',
        category: 'CRM',
        scheduleLabel: 'Nightly',
    },
    {
        key: 'github-sync',
        action: 'GITHUB_SYNC',
        title: 'Code-to-Cash Sync',
        description: 'Checks whether delivery telemetry can be correlated with project and billing activity.',
        icon: 'GitBranch',
        color: 'bg-purple-50 text-purple-600',
        category: 'Delivery',
        scheduleLabel: 'Hourly',
    },
];

export async function ensureAutomationJobs(companyId?: string | null) {
    await Promise.all(
        DEFAULT_AUTOMATION_JOBS.map((job) =>
            (prisma as any).automationJob.upsert({
                where: {
                    companyId_key: {
                        companyId: companyId ?? null,
                        key: job.key,
                    },
                },
                update: {
                    title: job.title,
                    description: job.description,
                    action: job.action,
                    icon: job.icon,
                    color: job.color,
                    category: job.category,
                    scheduleLabel: job.scheduleLabel,
                    isActive: true,
                },
                create: {
                    companyId: companyId ?? null,
                    key: job.key,
                    action: job.action,
                    title: job.title,
                    description: job.description,
                    icon: job.icon,
                    color: job.color,
                    category: job.category,
                    scheduleLabel: job.scheduleLabel,
                    isActive: true,
                },
            })
        )
    );
}

export function formatRelativeRun(date?: Date | string | null) {
    if (!date) return 'Never';
    const runDate = typeof date === 'string' ? new Date(date) : date;
    const diffMs = Date.now() - runDate.getTime();
    const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    const diffDays = Math.round(diffHours / 24);
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}
