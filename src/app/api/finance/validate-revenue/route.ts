import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { startOfDay, endOfDay } from 'date-fns';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const dateStr = searchParams.get('date') || new RegExp(/^\d{4}-\d{2}-\d{2}$/).test(new Date().toISOString().split('T')[0]!) ? new Date().toISOString().split('T')[0] : null;

            if (!dateStr) return createErrorResponse('Date is required (YYYY-MM-DD)', 400);
            if (!user.companyId) return createErrorResponse('Company association required', 403);

            const date = new Date(dateStr);
            const start = startOfDay(date);
            const end = endOfDay(date);

            // 1. Get total revenue from Work Reports
            const workReportRevenue = await prisma.workReport.aggregate({
                where: {
                    companyId: user.companyId,
                    date: {
                        gte: start,
                        lte: end
                    }
                },
                _sum: {
                    revenueGenerated: true
                }
            });

            // 2. Get total revenue from Financial Records
            const financeRevenue = await prisma.financialRecord.aggregate({
                where: {
                    companyId: user.companyId,
                    type: 'REVENUE',
                    date: {
                        gte: start,
                        lte: end
                    },
                    status: 'COMPLETED'
                },
                _sum: {
                    amount: true
                }
            });

            const reportedTotal = workReportRevenue._sum.revenueGenerated || 0;
            const actualTotal = financeRevenue._sum.amount || 0;
            const mismatch = Math.abs(reportedTotal - actualTotal);
            const isValid = mismatch < 0.01; // Accounting for floating point

            return NextResponse.json({
                date: dateStr,
                reportedTotal,
                actualTotal,
                mismatch,
                isValid,
                alert: !isValid ? `Mismatch detected! Reported: ${reportedTotal}, Actual: ${actualTotal}` : null
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
