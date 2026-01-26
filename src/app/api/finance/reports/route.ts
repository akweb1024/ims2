import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { FinanceReportsService } from '@/lib/services/finance-reports';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get('type');
        const start = searchParams.get('start');
        const end = searchParams.get('end');

        // Default to current date if not provided
        const now = new Date();
        const startDate = start ? new Date(start) : new Date(now.getFullYear(), 0, 1); // Jan 1st
        const endDate = end ? new Date(end) : now;

        const company = await prisma.company.findFirst();
        if (!company) return NextResponse.json({ error: 'No company' }, { status: 404 });

        if (type === 'pl') {
            const data = await FinanceReportsService.getProfitAndLoss(company.id, startDate, endDate);
            return NextResponse.json(data);
        } else if (type === 'bs') {
            const data = await FinanceReportsService.getBalanceSheet(company.id, endDate);
            return NextResponse.json(data);
        } else if (type === 'metrics') {
            const data = await FinanceReportsService.getMonthlyMetrics(company.id, 6);
            return NextResponse.json(data);
        } else {
            return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error fetching report:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
