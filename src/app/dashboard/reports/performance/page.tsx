import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { canAccessAllCompanies } from '@/lib/access-policy';
import PerformanceReportTable from './PerformanceReportTable';

export const dynamic = 'force-dynamic';

// This page had no role check of any kind, so any authenticated account —
// including CUSTOMER, AGENCY and REVIEWER — could read staff performance scores.
// Matches the audiences of the sibling reports in this directory.
const REPORT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'HR_MANAGER', 'HR'];

async function getPerformanceData() {
    const user = await getAuthenticatedUser();
    if (!user || !REPORT_ROLES.includes(user.role)) redirect('/dashboard');

    // Fetch latest monthly snapshots
    const date = new Date();
    const currentMonth = date.getMonth(); // 0-indexed
    const currentYear = date.getFullYear();

    const where: any = { month: currentMonth, year: currentYear };

    // `companyId: user.companyId || undefined` dropped the filter entirely for a
    // null-company user — Prisma ignores an undefined key rather than matching null —
    // returning every company's snapshots.
    if (!canAccessAllCompanies(user)) {
        if (!user.companyId) return [];
        where.companyId = user.companyId;
    }

    const snapshots = await prisma.monthlyPerformanceSnapshot.findMany({
        where,
        include: {
            employee: {
                select: {
                    user: {
                        select: {
                            name: true,
                            manager: { select: { name: true } },
                            department: { select: { name: true } }
                        }
                    },
                    designatRef: { select: { name: true } }
                }
            }
        },
        orderBy: { overallScore: 'desc' },
        take: 50 // Top 50 performers
    });

    return snapshots.map(snap => {
        const u = snap.employee?.user;
        const desig = snap.employee?.designatRef?.name;

        return {
            id: snap.id,
            employeeName: u?.name || 'Unknown',
            managerName: u?.manager?.name || 'N/A',
            department: u?.department?.name || 'N/A',
            designation: desig || 'N/A',
            overallScore: snap.overallScore,
            revenueGenerated: snap.totalRevenueGenerated,
            tasksCompleted: snap.tasksCompleted,
            attendanceScore: snap.attendanceScore,
            isTopPerformer: snap.isTopPerformer,
            month: snap.month,
            year: snap.year
        };
    });
}

export default async function TopPerformersPage() {
    const data = await getPerformanceData();

    return (
        <>
            <div className="p-6 space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-black text-secondary-900">Top Performers</h1>
                        <p className="text-sm text-secondary-600 mt-1">Employee of the Month & Performance Leaders</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-secondary-200 overflow-hidden">
                    <PerformanceReportTable data={data} />
                </div>
            </div>
        </>
    );
}
