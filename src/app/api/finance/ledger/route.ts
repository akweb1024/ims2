import { NextRequest, NextResponse } from 'next/server';
import { FinanceService } from '@/lib/services/finance';
import { authorizedRoute } from '@/lib/middleware-auth';
import { resolveCompanyScope } from '@/lib/access-policy';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
    try {
        const { searchParams } = new URL(req.url);
        const accountId = searchParams.get('accountId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (!accountId) {
            return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
        }

        const companyId = await resolveCompanyScope(req, user, { required: true });
        if (!companyId) return NextResponse.json({ error: 'Company scope required' }, { status: 400 });

        const ledger = await FinanceService.getAccountLedger(
            companyId,
            accountId,
            startDate ? new Date(startDate) : undefined,
            endDate ? new Date(endDate) : undefined
        );

        return NextResponse.json(ledger);
    } catch (error) {
        console.error('Error fetching ledger:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
    }
);
