
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized Access' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const fiscalYearParam = searchParams.get('fiscalYear');
        const companyId = searchParams.get('companyId');

        // 1. Base Filters
        const incrementWhere: any = { isDraft: false };
        const revenueWhere: any = { status: 'VERIFIED' };

        if (companyId && companyId !== 'ALL') {
            incrementWhere.employeeProfile = { user: { companyId } };
            revenueWhere.companyId = companyId;
        }

        // 2. Fiscal Year Logic (Reuse from existing analytics)
        if (fiscalYearParam) {
            const parts = fiscalYearParam.split('-');
            let startYear = parseInt(parts[0]);
            let endYear = parseInt(parts[1]);
            if (startYear < 100) startYear += 2000;
            if (endYear < 100) endYear += 2000;

            const start = new Date(`${startYear}-04-01`);
            const end = new Date(`${endYear}-03-31T23:59:59`);

            incrementWhere.effectiveDate = { gte: start, lte: end };
            revenueWhere.paymentDate = { gte: start, lte: end };
        }

        // 3. Fetch Data
        const [increments, revenueTransactions, companies] = await Promise.all([
            prisma.salaryIncrementRecord.findMany({
                where: incrementWhere,
                include: {
                    employeeProfile: {
                        include: { user: { include: { department: true } } }
                    }
                },
                orderBy: { effectiveDate: 'asc' }
            }),
            prisma.revenueTransaction.findMany({
                where: revenueWhere,
                orderBy: { paymentDate: 'asc' }
            }),
            prisma.company.findMany({ select: { id: true, name: true } })
        ]);

        // 4. Process Increment Data
        const totalIncrementImpact = increments.reduce((sum, i) => sum + (i.incrementAmount || 0), 0);
        const avgIncrementPerc = increments.length > 0
            ? increments.reduce((sum, i) => sum + (i.percentage || 0), 0) / increments.length
            : 0;

        // 5. Process Revenue Data
        const totalRevenueValue = revenueTransactions.reduce((sum, r) => sum + (r.amount || 0), 0);

        // 6. Monthly Trends (Combined)
        const monthlyTrends: Record<string, { month: string, increment: number, revenue: number, timestamp: number }> = {};

        increments.forEach(inc => {
            const d = new Date(inc.effectiveDate);
            const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
            const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
            if (!monthlyTrends[key]) {
                monthlyTrends[key] = { month: label, increment: 0, revenue: 0, timestamp: d.getTime() };
            }
            monthlyTrends[key].increment += (inc.incrementAmount || 0);
        });

        revenueTransactions.forEach(rev => {
            const d = new Date(rev.paymentDate);
            const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
            const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
            if (!monthlyTrends[key]) {
                monthlyTrends[key] = { month: label, increment: 0, revenue: 0, timestamp: d.getTime() };
            }
            monthlyTrends[key].revenue += (rev.amount || 0);
        });

        const sortedTrends = Object.values(monthlyTrends).sort((a, b) => a.timestamp - b.timestamp);

        // 7. Company Breakdown
        const companyBreakdown = companies.map(comp => {
            const compIncrements = increments.filter(i => i.employeeProfile?.user?.companyId === comp.id);
            const compRevenue = revenueTransactions.filter(r => r.companyId === comp.id);

            const incImpact = compIncrements.reduce((sum, i) => sum + (i.incrementAmount || 0), 0);
            const revTotal = compRevenue.reduce((sum, r) => sum + (r.amount || 0), 0);

            return {
                id: comp.id,
                name: comp.name,
                incrementImpact: incImpact,
                revenueTotal: revTotal,
                roi: incImpact > 0 ? (revTotal / incImpact).toFixed(2) : '0'
            };
        });

        return NextResponse.json({
            summary: {
                totalIncrementImpact,
                totalRevenue: totalRevenueValue,
                activeIncrements: increments.length,
                revenueCount: revenueTransactions.length,
                avgIncrementPercentage: avgIncrementPerc,
                groupRoi: totalIncrementImpact > 0 ? (totalRevenueValue / totalIncrementImpact).toFixed(2) : '0'
            },
            trends: sortedTrends,
            companyBreakdown,
            fiscalYear: fiscalYearParam || 'All Time'
        });

    } catch (error: any) {
        logger.error('Super Admin Financial Analytics Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
