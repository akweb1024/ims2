
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
            const departmentId = searchParams.get('departmentId');
            const filterCompanyId = searchParams.get('companyId');

            // 1. Fiscal Year Logic
            let fiscalYearStart: Date | undefined;
            let fiscalYearEnd: Date | undefined;

            if (fiscalYearParam) {
                const parts = fiscalYearParam.split('-');
                let startYear = parseInt(parts[0]);
                let endYear = parseInt(parts[1]);

                if (startYear < 100) startYear += 2000;
                if (endYear < 100) endYear += 2000;

                fiscalYearStart = new Date(`${startYear}-04-01`);
                fiscalYearEnd = new Date(`${endYear}-03-31T23:59:59`);
            }

            // 2. Scope Filter Construction
            const where: any = {};
            const targetCompanyId = (user.role === 'SUPER_ADMIN' && filterCompanyId) ? filterCompanyId : user.companyId;

            if (scope === 'INDIVIDUAL') {
                if (employeeId) {
                    where.employeeId = employeeId;
                } else {
                    const profile = await prisma.employeeProfile.findUnique({ where: { userId: user.id } });
                    if (profile) where.employeeId = profile.id;
                }
            } else if (scope === 'TEAM') {
                const reports = await prisma.user.findMany({
                    where: { managerId: user.id },
                    select: { employeeProfile: { select: { id: true } } }
                });
                const reportIds = reports.map(r => r.employeeProfile?.id).filter(Boolean);
                where.employeeId = { in: reportIds };
            } else {
                if (!['SUPER_ADMIN', 'ADMIN', 'HR', 'HR_MANAGER', 'FINANCE_ADMIN'].includes(user.role)) {
                    return NextResponse.json({ error: 'Unauthorized for Company scope' }, { status: 403 });
                }

                if (targetCompanyId) {
                    where.employeeProfile = { user: { companyId: targetCompanyId } };
                }
            }

            // Apply Department Filter if Segmenting
            if (departmentId) {
                where.employeeProfile = {
                    ...where.employeeProfile,
                    user: {
                        ...(where.employeeProfile?.user || {}),
                        departmentId
                    }
                };
            }

            // 3. Status Filter Logic
            // Statuses: DRAFT, MANAGER_APPROVED, HR_APPROVED, APPROVED, REJECTED
            const statusFilter: any = {};
            if (statusParam === 'APPROVED') {
                statusFilter.in = ['APPROVED'];
            } else if (statusParam === 'RECOMMENDED') {
                statusFilter.in = ['MANAGER_APPROVED', 'HR_APPROVED'];
            } else if (statusParam === 'ALL') {
                // Return all records, no filter needed (or exclude REJECTED if desired, but ALL should imply ALL)
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
            const increments = (await prisma.salaryIncrementRecord.findMany({
                where,
                include: {
                    employeeProfile: {
                        include: {
                            user: {
                                include: { department: true }
                            }
                        }
                    },
                    reviews: true // Include reviews to calculate achievement
                },
                orderBy: { effectiveDate: 'asc' }
            })) as any[];

            // 5. Data Processing / Aggregation
            const totalImpact = increments.reduce((sum, i) => sum + (i.incrementAmount || 0), 0);
            const totalMonthlyFixSalary = increments.reduce((sum, i) => sum + (i.monthlyFixSalary || 0), 0);
            const totalMonthlyVariableSalary = increments.reduce((sum, i) => sum + (i.monthlyVariableSalary || 0), 0);
            const totalMonthlyFixTarget = increments.reduce((sum, i) => sum + (i.monthlyFixTarget || 0), 0);
            const totalMonthlyVariableTarget = increments.reduce((sum, i) => sum + (i.monthlyVariableTarget || 0), 0);
            const totalMonthlyTarget = increments.reduce((sum, i) => sum + (i.monthlyTotalTarget || 0), 0);

            // Fetch Reviews separately if we want to include all reviews in the period, 
            // even if the record was effective before the period.
            // But usually, we only care about reviews for the increments being analyzed in this scope.
            let allReviews: any[] = [];
            increments.forEach(inc => {
                if (inc.reviews) allReviews = [...allReviews, ...inc.reviews];
            });

            const totalAchievement = allReviews.reduce((sum, r) => sum + (r.revenueAchievement || 0), 0);
            const reviewsWithRating = allReviews.filter(r => (r as any).rating !== undefined && (r as any).rating !== null);
            const avgRating = reviewsWithRating.length > 0
                ? reviewsWithRating.reduce((sum, r) => sum + ((r as any).rating || 0), 0) / reviewsWithRating.length
                : 0;

            const qTotals = {
                q1: increments.reduce((sum, i) => sum + (i.q1Target || 0), 0),
                q2: increments.reduce((sum, i) => sum + (i.q2Target || 0), 0),
                q3: increments.reduce((sum, i) => sum + (i.q3Target || 0), 0),
                q4: increments.reduce((sum, i) => sum + (i.q4Target || 0), 0),
            };

            const avgPercentage = increments.length > 0
                ? increments.reduce((sum, i) => sum + (i.percentage || 0), 0) / increments.length
                : 0;

            // Trend Data (Monthly Aggregation)
            const trendMap = new Map();

            // Initialize trendMap with all months in the selected FY if possible
            if (fiscalYearStart) {
                const current = new Date(fiscalYearStart);
                while (current <= fiscalYearEnd!) {
                    const key = `${current.getFullYear()}-${current.getMonth()}`;
                    trendMap.set(key, {
                        date: new Date(current),
                        label: current.toLocaleString('default', { month: 'short', year: '2-digit' }),
                        amount: 0,
                        revenueTarget: 0,
                        revenueAchieved: 0,
                        avgRating: 0,
                        ratingCount: 0,
                        count: 0,
                        totalPerc: 0,
                        realRevenue: 0,
                        realExpense: 0
                    });
                    current.setMonth(current.getMonth() + 1);
                }
            }

            // 5. Fetch Actual Financials (Revenue & Expenses)
            const revenueTransactions = await prisma.revenueTransaction.findMany({
                where: {
                    companyId: targetCompanyId || undefined,
                    departmentId: departmentId || undefined,
                    status: 'VERIFIED' as any,
                    paymentDate: fiscalYearStart && fiscalYearEnd ? {
                        gte: fiscalYearStart,
                        lte: fiscalYearEnd
                    } : undefined
                }
            });

            const expenseRecords = await prisma.financialRecord.findMany({
                where: {
                    companyId: targetCompanyId || undefined,
                    type: 'EXPENSE',
                    status: 'COMPLETED',
                    date: fiscalYearStart && fiscalYearEnd ? {
                        gte: fiscalYearStart,
                        lte: fiscalYearEnd
                    } : undefined
                }
            });

            // Map Increments to Trends (by effective date)
            increments.forEach(inc => {
                const d = new Date(inc.effectiveDate);
                const key = `${d.getFullYear()}-${d.getMonth()}`;

                let current = trendMap.get(key);
                if (!current) {
                    current = {
                        date: d,
                        label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
                        amount: 0,
                        revenueTarget: 0,
                        revenueAchieved: 0,
                        avgRating: 0,
                        ratingCount: 0,
                        count: 0,
                        totalPerc: 0,
                        realRevenue: 0,
                        realExpense: 0
                    };
                    trendMap.set(key, current);
                }

                current.amount += (inc.incrementAmount || 0);
                current.revenueTarget += (inc.monthlyTotalTarget || 0);
                current.count += 1;
                current.totalPerc += (inc.percentage || 0);
            });

            // Map Actual Revenue to Trends
            revenueTransactions.forEach(rev => {
                const d = new Date(rev.paymentDate);
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                const current = trendMap.get(key);
                if (current) {
                    current.realRevenue += (rev.amount || 0);
                }
            });

            // Map Actual Expenses to Trends
            expenseRecords.forEach(exp => {
                const d = new Date(exp.date);
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                const current = trendMap.get(key);
                if (current) {
                    current.realExpense += (exp.amount || 0);
                }
            });

            // Map Reviews to Trends (by review month/year or date)
            allReviews.forEach(rev => {
                let d: Date;
                if (rev.month && rev.year) {
                    d = new Date(rev.year, rev.month - 1, 1);
                } else {
                    d = new Date(rev.date);
                }
                const key = `${d.getFullYear()}-${d.getMonth()}`;
                const current = trendMap.get(key);
                if (current) {
                    current.revenueAchieved += (rev.revenueAchievement || 0);
                    if ((rev as any).rating) {
                        current.avgRating = ((current.avgRating * current.ratingCount) + (rev as any).rating) / (current.ratingCount + 1);
                        current.ratingCount += 1;
                    }
                }
            });

            // Convert to Array & Calc Averages
            const trendData = Array.from(trendMap.values())
                .sort((a: any, b: any) => a.date.getTime() - b.date.getTime())
                .map((t: any) => ({
                    month: t.label,
                    amount: t.amount,
                    revenueTarget: t.revenueTarget,
                    revenueAchieved: t.revenueAchieved,
                    realRevenue: t.realRevenue,
                    realExpense: t.realExpense,
                    avgRating: parseFloat((t.avgRating).toFixed(1)),
                    count: t.count,
                    percentage: t.count > 0 ? parseFloat((t.totalPerc / t.count).toFixed(2)) : 0
                }));

            // Department Distribution (Impact vs Target)
            const deptMap = new Map();
            increments.forEach(inc => {
                const dept = inc.employeeProfile?.user?.department?.name || 'Unassigned';
                const current = deptMap.get(dept) || { impact: 0, target: 0, achieved: 0 };
                current.impact += (inc.incrementAmount || 0);
                current.target += (inc.monthlyTotalTarget || 0);

                // Achievement per department in this filter scope
                const deptAchieved = (inc.reviews as any[])?.reduce((sum, r) => sum + (r.revenueAchievement || 0), 0) || 0;
                current.achieved += deptAchieved;

                deptMap.set(dept, current);
            });

            const departmentData = Array.from(deptMap.entries()).map(([name, data]) => ({
                name,
                impact: data.impact,
                target: data.target,
                achieved: data.achieved
            }));

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
                    designation: inc.newDesignation || inc.employeeProfile?.designation || 'N/A',
                    department: inc.employeeProfile?.user?.department?.name || 'N/A',
                    amount: inc.incrementAmount,
                    percentage: inc.percentage,
                    newSalary: inc.newSalary,
                    effectiveDate: inc.effectiveDate,
                    achievement: (inc.reviews as any[])?.reduce((sum, r) => sum + (r.revenueAchievement || 0), 0) || 0
                }));

            // 8. Designation Breakdown
            const desigMap = new Map();
            increments.forEach(inc => {
                const d = inc.employeeProfile?.designation || 'Unknown';
                const current = desigMap.get(d) || 0;
                desigMap.set(d, current + (inc.incrementAmount || 0));
            });
            const designationData = Array.from(desigMap.entries())
                .map(([name, value]) => ({ name, value }))
                .sort((a, b: any) => b.value - a.value) // Sort by impact
                .slice(0, 8); // Top 8 designations

            const totalRealRevenue = revenueTransactions.reduce((sum, r) => sum + (r.amount || 0), 0);
            const totalRealExpense = expenseRecords.reduce((sum, e) => sum + (e.amount || 0), 0);

            return NextResponse.json({
                stats: {
                    totalApprovedBudgetImpact: totalImpact,
                    approvedCount: increments.length,
                    averagePercentage: avgPercentage,
                    averageRating: avgRating,
                    totalApprovedPerksImpact: increments.reduce((sum, i) => sum + ((i.newHealthCare || 0) + (i.newTravelling || 0) + (i.newMobile || 0) + (i.newInternet || 0) + (i.newBooksAndPeriodicals || 0)), 0),
                    totalRevenueAchieved: totalAchievement,
                    totalRealRevenue,
                    totalRealExpense,
                    totalPendingBudgetImpact: 0, // Placeholder
                    roiMultiplier: (totalImpact > 0 && (totalMonthlyFixSalary + totalMonthlyVariableSalary) > 0)
                        ? (totalMonthlyTarget / (totalMonthlyFixSalary + totalMonthlyVariableSalary))
                        : 0,
                    achievementRate: totalMonthlyTarget > 0 ? (totalAchievement / (totalMonthlyTarget * 12)) * 100 : 0, // Approx
                    breakdown: {
                        fixed: totalMonthlyFixSalary,
                        variable: totalMonthlyVariableSalary,
                        incentive: increments.reduce((sum, i) => sum + (i.newIncentive || 0), 0),
                        perks: increments.reduce((sum, i) => sum + ((i.newHealthCare || 0) + (i.newTravelling || 0) + (i.newMobile || 0) + (i.newInternet || 0) + (i.newBooksAndPeriodicals || 0)), 0),
                        revenue: totalRealRevenue,
                        expense: totalRealExpense
                    },
                    targetBreakdown: {
                        fixed: totalMonthlyFixTarget,
                        variable: totalMonthlyVariableTarget,
                        total: totalMonthlyTarget,
                        achieved: totalAchievement,
                        avgRating: avgRating
                    }
                },
                trends: trendData,
                departments: departmentData,
                distribution: distributionData,
                topAdjustments: topIncrements,
                designationData,
                quarterlyBreakdown: qTotals,
                fiscalYear: fiscalYearParam || 'Current',
                raw: increments.length
            });

        } catch (error) {
            logger.error('Error fetching increment analytics:', error);
            return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
        }
    }
);
