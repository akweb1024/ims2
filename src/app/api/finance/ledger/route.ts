import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FinanceService } from '@/lib/services/finance';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const accountId = searchParams.get('accountId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (!accountId) {
            return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
        }

        const company = await prisma.company.findFirst();
        if (!company) return NextResponse.json({ error: 'No company' }, { status: 404 });

        const ledger = await FinanceService.getAccountLedger(
            company.id,
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
