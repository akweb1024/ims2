import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Prisma } from '@prisma/client';
import type { UserRole } from '@prisma/client';
import type { LucideIcon } from 'lucide-react';
import {
    Activity,
    ArrowRight,
    Building2,
    CheckCircle2,
    FileWarning,
    KeyRound,
    LockKeyhole,
    ShieldAlert,
    Users,
} from 'lucide-react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { ACCESS_POLICY_MODULES } from '@/lib/access-policy';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Access Policy Audit | STM Dashboard' };

const elevatedRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'FINANCE_ADMIN', 'MANAGER'];
const hrRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR'];
const financeRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'];
const sensitiveModules = new Set(['HR', 'FINANCE', 'COMPANY', 'SUPER_ADMIN', ACCESS_POLICY_MODULES.ALL_COMPANIES]);

const userSelect = Prisma.validator<Prisma.UserSelect>()({
    id: true,
    email: true,
    name: true,
    role: true,
    isActive: true,
    allowedModules: true,
    companyId: true,
    department: { select: { name: true } },
    company: { select: { id: true, name: true } },
    companies: { select: { id: true, name: true } },
    _count: { select: { auditLogs: true } },
});

type PolicyUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;

type RiskLevel = 'critical' | 'high' | 'medium' | 'low';

type PolicyRow = PolicyUser & {
    companyNames: string[];
    riskLevel: RiskLevel;
    riskReasons: string[];
    hasAllCompanies: boolean;
    hasSensitiveModule: boolean;
    linkedCompanyCount: number;
};

const riskStyles: Record<RiskLevel, string> = {
    critical: 'bg-rose-50 text-rose-700 border-rose-200',
    high: 'bg-amber-50 text-amber-700 border-amber-200',
    medium: 'bg-blue-50 text-blue-700 border-blue-200',
    low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const riskOrder: Record<RiskLevel, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
};

const moduleStyles: Record<string, string> = {
    ALL_COMPANIES: 'bg-amber-100 text-amber-800 border-amber-200',
    HR: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
    FINANCE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    COMPANY: 'bg-sky-100 text-sky-800 border-sky-200',
    CORE: 'bg-secondary-100 text-secondary-700 border-secondary-200',
};

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
});

function formatDate(date: Date) {
    return dateFormatter.format(date);
}

function uniqueCompanies(user: PolicyUser) {
    const companyMap = new Map<string, string>();
    if (user.company) {
        companyMap.set(user.company.id, user.company.name);
    }
    for (const company of user.companies) {
        companyMap.set(company.id, company.name);
    }
    return Array.from(companyMap.values()).sort((a, b) => a.localeCompare(b));
}

function buildPolicyRow(user: PolicyUser): PolicyRow {
    const modules = new Set(user.allowedModules || []);
    const companyNames = uniqueCompanies(user);
    const hasAllCompanies = user.role === 'SUPER_ADMIN' || modules.has(ACCESS_POLICY_MODULES.ALL_COMPANIES);
    const hasHrAccess = hrRoles.includes(user.role) || modules.has('HR');
    const hasFinanceAccess = financeRoles.includes(user.role) || modules.has('FINANCE');
    const hasSensitiveModule = Array.from(modules).some((moduleId) => sensitiveModules.has(moduleId));
    const riskReasons: string[] = [];

    if (hasAllCompanies) riskReasons.push('All company scope');
    if (hasHrAccess) riskReasons.push('HR data capable');
    if (hasFinanceAccess) riskReasons.push('Finance capable');
    if (companyNames.length > 1) riskReasons.push(`${companyNames.length} linked companies`);
    if (!user.isActive && (hasAllCompanies || hasSensitiveModule || elevatedRoles.includes(user.role))) {
        riskReasons.push('Inactive privileged user');
    }
    if (!user.companyId && !hasAllCompanies) riskReasons.push('No primary company');

    let riskLevel: RiskLevel = 'low';
    if (hasAllCompanies && (hasHrAccess || hasFinanceAccess)) {
        riskLevel = 'critical';
    } else if (hasAllCompanies || (companyNames.length > 1 && (hasHrAccess || hasFinanceAccess))) {
        riskLevel = 'high';
    } else if (companyNames.length > 1 || hasSensitiveModule || elevatedRoles.includes(user.role)) {
        riskLevel = 'medium';
    }

    if (riskReasons.length === 0) {
        riskReasons.push('Standard scoped access');
    }

    return {
        ...user,
        companyNames,
        riskLevel,
        riskReasons,
        hasAllCompanies,
        hasSensitiveModule,
        linkedCompanyCount: companyNames.length,
    };
}

function StatCard({
    icon: Icon,
    label,
    value,
    detail,
    tone,
}: {
    icon: LucideIcon;
    label: string;
    value: number;
    detail: string;
    tone: string;
}) {
    return (
        <div className="rounded-2xl border border-secondary-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-secondary-500">{label}</p>
                    <p className="mt-2 text-3xl font-black text-secondary-950">{value}</p>
                </div>
                <div className={`rounded-xl border p-3 ${tone}`}>
                    <Icon size={20} />
                </div>
            </div>
            <p className="mt-3 text-sm font-medium text-secondary-500">{detail}</p>
        </div>
    );
}

function RiskBadge({ level }: { level: RiskLevel }) {
    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black uppercase tracking-wider ${riskStyles[level]}`}>
            {level}
        </span>
    );
}

function ModuleBadge({ moduleId }: { moduleId: string }) {
    const className = moduleStyles[moduleId] || 'bg-slate-100 text-slate-700 border-slate-200';
    return (
        <span className={`inline-flex items-center rounded-lg border px-2 py-1 text-[11px] font-black uppercase tracking-wide ${className}`}>
            {moduleId.replace(/_/g, ' ')}
        </span>
    );
}

export default async function AccessPolicyAuditPage() {
    const user = await getSessionUser();
    if (!user || user.role !== 'SUPER_ADMIN') {
        redirect('/dashboard');
    }

    const [users, recentPolicyLogs, companyCount] = await Promise.all([
        prisma.user.findMany({
            select: userSelect,
            orderBy: [{ role: 'asc' }, { email: 'asc' }],
            take: 500,
        }),
        prisma.auditLog.findMany({
            where: {
                OR: [
                    { action: 'DENY_MODULE_ACCESS' },
                    { entity: 'user' },
                    { entity: 'module_access' },
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: 12,
            include: {
                user: {
                    select: {
                        name: true,
                        email: true,
                        role: true,
                    },
                },
            },
        }),
        prisma.company.count(),
    ]);

    const policyRows = users
        .map(buildPolicyRow)
        .filter((row) => row.riskLevel !== 'low' || row.allowedModules.length > 1 || row.role === 'SUPER_ADMIN')
        .sort((a, b) => {
            const riskDelta = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
            if (riskDelta !== 0) return riskDelta;
            return a.email.localeCompare(b.email);
        });

    const allCompanyGrants = policyRows.filter((row) => row.hasAllCompanies).length;
    const multiCompanyUsers = policyRows.filter((row) => row.linkedCompanyCount > 1).length;
    const sensitiveAccessUsers = policyRows.filter((row) => row.hasSensitiveModule || elevatedRoles.includes(row.role)).length;
    const inactivePrivilegedUsers = policyRows.filter((row) => !row.isActive && row.riskLevel !== 'low').length;

    return (
        <DashboardLayout userRole={user.role}>
            <div className="space-y-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-amber-700">
                            <LockKeyhole size={14} />
                            Super Admin Only
                        </div>
                        <h1 className="mt-4 flex items-center gap-3 text-3xl font-black tracking-tight text-secondary-950">
                            <ShieldAlert className="text-amber-600" size={34} />
                            Access Policy Audit
                        </h1>
                        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-secondary-500">
                            Review company scope, module grants, and recent access-policy events without changing employee, attendance, or work-report records.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            href="/dashboard/users"
                            className="inline-flex items-center gap-2 rounded-xl border border-secondary-200 bg-white px-4 py-2.5 text-sm font-black text-secondary-700 shadow-sm transition-colors hover:bg-secondary-50"
                        >
                            <Users size={16} />
                            Manage Users
                        </Link>
                        <Link
                            href="/dashboard/super-admin/audit-logs"
                            className="inline-flex items-center gap-2 rounded-xl bg-secondary-950 px-4 py-2.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-secondary-800"
                        >
                            System Logs
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                        icon={Building2}
                        label="All Company Scope"
                        value={allCompanyGrants}
                        detail={`${companyCount} companies are available to all-company actors.`}
                        tone="border-amber-200 bg-amber-50 text-amber-700"
                    />
                    <StatCard
                        icon={Users}
                        label="Multi-company Users"
                        value={multiCompanyUsers}
                        detail="Users linked to more than one company."
                        tone="border-blue-200 bg-blue-50 text-blue-700"
                    />
                    <StatCard
                        icon={KeyRound}
                        label="Sensitive Access"
                        value={sensitiveAccessUsers}
                        detail="Elevated roles or sensitive module grants."
                        tone="border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700"
                    />
                    <StatCard
                        icon={FileWarning}
                        label="Inactive Privileged"
                        value={inactivePrivilegedUsers}
                        detail="Inactive accounts that still carry elevated scope."
                        tone="border-rose-200 bg-rose-50 text-rose-700"
                    />
                </div>

                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                    <section className="overflow-hidden rounded-2xl border border-secondary-100 bg-white shadow-sm">
                        <div className="border-b border-secondary-100 bg-secondary-50/70 px-5 py-4">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <h2 className="text-lg font-black text-secondary-950">Policy Review Queue</h2>
                                    <p className="text-sm font-medium text-secondary-500">
                                        Showing {policyRows.length} users with elevated, broad, or unusual access.
                                    </p>
                                </div>
                                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black uppercase tracking-widest text-emerald-700">
                                    <CheckCircle2 size={14} />
                                    Read Only
                                </span>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[980px] text-left">
                                <thead>
                                    <tr className="border-b border-secondary-100 bg-white text-xs font-black uppercase tracking-widest text-secondary-500">
                                        <th className="px-5 py-4">User</th>
                                        <th className="px-5 py-4">Risk</th>
                                        <th className="px-5 py-4">Companies</th>
                                        <th className="px-5 py-4">Modules</th>
                                        <th className="px-5 py-4">Reason</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-secondary-100">
                                    {policyRows.map((row) => (
                                        <tr key={row.id} className="align-top transition-colors hover:bg-secondary-50/60">
                                            <td className="px-5 py-4">
                                                <div className="font-black text-secondary-950">{row.name || 'Unnamed user'}</div>
                                                <div className="mt-1 text-xs font-semibold text-secondary-500">{row.email}</div>
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <span className="rounded-lg bg-secondary-100 px-2 py-1 text-[11px] font-black uppercase tracking-wide text-secondary-700">
                                                        {row.role}
                                                    </span>
                                                    <span className={`rounded-lg px-2 py-1 text-[11px] font-black uppercase tracking-wide ${row.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                                        {row.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <RiskBadge level={row.riskLevel} />
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="space-y-1">
                                                    {(row.companyNames.length > 0 ? row.companyNames : ['No company assigned']).map((companyName) => (
                                                        <div key={companyName} className="text-sm font-bold text-secondary-800">
                                                            {companyName}
                                                        </div>
                                                    ))}
                                                </div>
                                                {row.company && (
                                                    <div className="mt-2 text-[11px] font-black uppercase tracking-wide text-secondary-400">
                                                        Primary: {row.company.name}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex max-w-sm flex-wrap gap-2">
                                                    {(row.allowedModules.length > 0 ? row.allowedModules : ['CORE']).map((moduleId) => (
                                                        <ModuleBadge key={`${row.id}-${moduleId}`} moduleId={moduleId} />
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {row.riskReasons.map((reason) => (
                                                        <span key={`${row.id}-${reason}`} className="rounded-lg border border-secondary-200 bg-secondary-50 px-2.5 py-1 text-xs font-bold text-secondary-600">
                                                            {reason}
                                                        </span>
                                                    ))}
                                                </div>
                                                <div className="mt-3 text-[11px] font-bold uppercase tracking-wide text-secondary-400">
                                                    {row._count.auditLogs} audit events by this actor
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <aside className="space-y-6">
                        <section className="rounded-2xl border border-secondary-100 bg-white p-5 shadow-sm">
                            <h2 className="text-lg font-black text-secondary-950">Guardrails</h2>
                            <div className="mt-4 space-y-3">
                                {[
                                    'ALL_COMPANIES is treated as a privileged scope and is only writeable by SUPER_ADMIN actors.',
                                    'Company switching supports All Companies mode only for users with super-admin or explicit all-company scope.',
                                    'Operational APIs still require a selected company when a workflow needs one exact company.',
                                    'This page performs audit reads only and does not mutate HR, attendance, or work-report tables.',
                                ].map((item) => (
                                    <div key={item} className="flex gap-3 rounded-xl border border-secondary-100 bg-secondary-50/70 p-3">
                                        <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={16} />
                                        <p className="text-sm font-semibold leading-5 text-secondary-700">{item}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-2xl border border-secondary-100 bg-white p-5 shadow-sm">
                            <div className="flex items-center justify-between gap-3">
                                <h2 className="text-lg font-black text-secondary-950">Recent Policy Events</h2>
                                <Activity className="text-primary-600" size={20} />
                            </div>
                            <div className="mt-4 space-y-3">
                                {recentPolicyLogs.length > 0 ? (
                                    recentPolicyLogs.map((log) => (
                                        <div key={log.id} className="rounded-xl border border-secondary-100 bg-secondary-50/70 p-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <div className="text-sm font-black text-secondary-900">{log.action}</div>
                                                    <div className="mt-1 text-xs font-semibold text-secondary-500">
                                                        {log.entity} / {log.entityId}
                                                    </div>
                                                </div>
                                                <span className="rounded-lg bg-white px-2 py-1 text-[11px] font-black uppercase tracking-wide text-secondary-500">
                                                    {log.user?.role || 'System'}
                                                </span>
                                            </div>
                                            <div className="mt-2 text-xs font-medium text-secondary-500">
                                                {log.user?.name || log.user?.email || 'System process'} at {formatDate(log.createdAt)}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="rounded-xl border border-secondary-100 bg-secondary-50/70 p-4 text-sm font-semibold text-secondary-500">
                                        No recent access-policy audit events were found.
                                    </div>
                                )}
                            </div>
                        </section>
                    </aside>
                </div>
            </div>
        </DashboardLayout>
    );
}
