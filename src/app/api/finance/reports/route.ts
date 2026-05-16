import { NextRequest, NextResponse } from 'next/server';
import { FinanceReportsService } from '@/lib/services/finance-reports';
import { authorizedRoute } from '@/lib/middleware-auth';
import { resolveCompanyScope } from '@/lib/access-policy';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');
        const start = searchParams.get('start');
        const end = searchParams.get('end');

        // Default to current date if not provided
        const now = new Date();
        const startDate = start ? new Date(start) : new Date(now.getFullYear(), 0, 1); // Jan 1st
        const endDate = end ? new Date(end) : now;

        const companyId = await resolveCompanyScope(req, user, { required: true });
        if (!companyId) return NextResponse.json({ error: 'Company scope required' }, { status: 400 });

        if (type === 'pl') {
            const data = await FinanceReportsService.getProfitAndLoss(companyId, startDate, endDate);
            return NextResponse.json(data);
        } else if (type === 'bs') {
            const data = await FinanceReportsService.getBalanceSheet(companyId, endDate);
            return NextResponse.json(data);
        } else if (type === 'metrics') {
            const data = await FinanceReportsService.getMonthlyMetrics(companyId, 6);
            return NextResponse.json(data);
        } else {
            return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error fetching report:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    }
);
