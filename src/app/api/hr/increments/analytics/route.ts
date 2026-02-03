
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { logger } from '@/lib/logger';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR_MANAGER', 'HR', 'FINANCE_ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const fiscalYearParam = searchParams.get('fiscalYear'); // e.g., "24-25"
            const scope = searchParams.get('scope') || 'COMPANY'; // COMPANY, TEAM, INDIVIDUAL
            const statusParam = searchParams.get('status') || 'APPROVED'; // APPROVED, RECOMMENDED, ALL
            const employeeId = searchParams.get('employeeId');

            // 1. Fiscal Year Logic
            let fiscalYearStart: Date | undefined;
            let fiscalYearEnd: Date | undefined;

            if (fiscalYearParam) {
                // Handle "24-25" or "2024-25"
                const parts = fiscalYearParam.split('-');
                let startYear = parseInt(parts[0]);
                let endYear = parseInt(parts[1]);

                if (startYear < 100) startYear += 2000;
                if (endYear < 100) endYear += 2000;

                fiscalYearStart = new Date(`${startYear}-04-01`); // April 1st
                fiscalYearEnd = new Date(`${endYear}-03-31T23:59:59`); // March 31st
            }

            // 2. Scope Filter Construction
            const where: any = {};

            if (scope === 'INDIVIDUAL') {
                if (employeeId) {
                    where.employeeId = employeeId;
                } else {
                    // Fallback to self if no employeeId provided (for non-admins)
                    const profile = await prisma.employeeProfile.findUnique({ where: { userId: user.id } });
                    if (profile) where.employeeId = profile.id;
                }
            } else if (scope === 'TEAM') {
                // Get Direct Reports
                const reports = await prisma.user.findMany({
                    where: { managerId: user.id },
                    select: { employeeProfile: { select: { id: true } } }
                });
                const reportIds = reports.map(r => r.employeeProfile?.id).filter(Boolean);
                where.employeeId = { in: reportIds };
            } else {
                // COMPANY scope - ensure proper authorization
                if (!['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'FINANCE_ADMIN'].includes(user.role)) {
                    return NextResponse.json({ error: 'Unauthorized for Company scope' }, { status: 403 });
                }
                where.employeeProfile = { user: { companyId: user.companyId } };
            }

            // 3. Status Filter Logic
            // Statuses: DRAFT, MANAGER_APPROVED, HR_APPROVED, APPROVED, REJECTED
            const statusFilter: any = {};
            if (statusParam === 'APPROVED') {
                statusFilter.in = ['APPROVED'];
            } else if (statusParam === 'RECOMMENDED') {
                statusFilter.in = ['MANAGER_APPROVED', 'HR_APPROVED'];
            } else if (statusParam === 'ALL') {
                statusFilter.in = ['APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED'];
            }

            if (statusFilter.in) {
                where.status = statusFilter;
            }

            // 4. Date Filter
            if (fiscalYearStart && fiscalYearEnd) {
                where.effectiveDate = {
                    gte: fiscalYearStart,
                    lte: fiscalYearEnd
                };
            }

            // Fetch Records
            const increments = await prisma.salaryIncrementRecord.findMany({
                where,
                include: {
                    employeeProfile: {
                        include: {
                            user: {
                                include: { department: true }
                            }
                        }
                    }
                },
                orderBy: { effectiveDate: 'asc' }
            });

            // 5. Data Processing / Aggregation
            const totalImpact = increments.reduce((sum, i) => sum + (i.incrementAmount || 0), 0);
            const avgPercentage = increments.length > 0
                ? increments.reduce((sum, i) => sum + (i.percentage || 0), 0) / increments.length
                : 0;

            // Trend Data (Monthly Aggregation)
            const trendMap = new Map();
            increments.forEach(inc => {
                const d = new Date(inc.effectiveDate);
                const key = `${d.getFullYear()}-${d.getMonth()}`; // Unique year-month key
                const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });

                const current = trendMap.get(key) || {
                    date: d,
                    label,
                    amount: 0,
                    count: 0,
                    avgPerc: 0,
                    totalPerc: 0
                };

                current.amount += (inc.incrementAmount || 0);
                current.count += 1;
                current.totalPerc += (inc.percentage || 0);
                trendMap.set(key, current);
            });

            // Convert to Array & Calc Averages
            const trendData = Array.from(trendMap.values())
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .map((t: any) => ({
                    month: t.label,
                    amount: t.amount,
                    count: t.count,
                    percentage: t.count > 0 ? parseFloat((t.totalPerc / t.count).toFixed(2)) : 0
                }));

            // Department Distribution
            const deptMap = new Map();
            increments.forEach(inc => {
                const dept = inc.employeeProfile?.user?.department?.name || 'Unassigned';
                deptMap.set(dept, (deptMap.get(dept) || 0) + (inc.incrementAmount || 0));
            });

            const departmentData = Array.from(deptMap.entries()).map(([name, value]) => ({ name, value }));

            // 6. Distribution Buckets (Percentage)
            const percBuckets = { '0-5%': 0, '5-10%': 0, '10-15%': 0, '15-20%': 0, '20%+': 0 };
            increments.forEach(inc => {
                const p = inc.percentage || 0;
                if (p <= 5) percBuckets['0-5%']++;
                else if (p <= 10) percBuckets['5-10%']++;
                else if (p <= 15) percBuckets['10-15%']++;
                else if (p <= 20) percBuckets['15-20%']++;
                else percBuckets['20%+']++;
            });
            const distributionData = Object.entries(percBuckets).map(([name, value]) => ({ name, value }));

            // 7. Top 5 Increments
            const topIncrements = [...increments]
                .sort((a, b) => (b.incrementAmount || 0) - (a.incrementAmount || 0))
                .slice(0, 5)
                .map(inc => ({
                    id: inc.id,
                    name: inc.employeeProfile?.user?.name || 'Unknown',
                    designation: inc.employeeProfile?.designation || 'N/A',
                    amount: inc.incrementAmount,
                    percentage: inc.percentage,
                    newSalary: inc.newSalary
                }));

            // 8. Designation Breakdown
            const desigMap = new Map();
            increments.forEach(inc => {
                const d = inc.employeeProfile?.designation || 'Unknown';
                desigMap.set(d, (desigMap.get(d) || 0) + (inc.incrementAmount || 0));
            });
            const designationData = Array.from(desigMap.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b: any) => b.value - a.value) // Sort by impact
                .slice(0, 8); // Top 8 designations

            return NextResponse.json({
                summary: {
                    totalImpact,
                    count: increments.length,
                    avgPercentage: parseFloat(avgPercentage.toFixed(2))
                },
                trendData,
                departmentData,
                distributionData,
                topIncrements,
                designationData,
                raw: increments.length // Debug info
            });

        } catch (error) {
            logger.error('Error fetching increment analytics:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);
