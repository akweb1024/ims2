import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { startOfDay, endOfDay } from 'date-fns';

export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const { searchParams } = new URL(req.url);
            const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
            const days = parseInt(searchParams.get('days') || '1');

            if (!user.companyId) return createErrorResponse('Company association required', 403);

            const results = [];
            const endDate = new Date(dateStr);

            for (let i = 0; i < days; i++) {
                const currentDate = new Date(endDate);
                currentDate.setDate(currentDate.getDate() - i);
                const start = startOfDay(currentDate);
                const end = endOfDay(currentDate);

                // 1. Get total revenue from Work Reports
                const workReportRevenue = await prisma.workReport.aggregate({
                    where: {
                        companyId: user.companyId,
                        date: { gte: start, lte: end }
                    },
                    _sum: { revenueGenerated: true }
                });

                // 2. Get revenue from Financial Records
                const financeRevenue = await prisma.financialRecord.aggregate({
                    where: {
                        companyId: user.companyId,
                        type: 'REVENUE',
                        date: { gte: start, lte: end },
                        status: 'COMPLETED'
                    },
                    _sum: { amount: true }
                });

                // 3. Get revenue from Razorpay Payments
                const razorpayRevenue = await prisma.payment.aggregate({
                    where: {
                        companyId: user.companyId,
                        status: 'captured',
                        paymentDate: { gte: start, lte: end }
                    },
                    _sum: { amount: true }
                });

                const reportedTotal = workReportRevenue._sum.revenueGenerated || 0;
                // Use the higher of FinancialRecord or Razorpay, or sum them if they are complementary? 
                // Usually Razorpay is auto-synced, while FinancialRecord is manual. 
                // Most reliable is Razorpay, but some might be cash/offline (FinancialRecord).
                // Let's sum them but avoid double counting? 
                // For now, let's treat FinancialRecord as the 'Official' book and Razorpay as the 'Digital' source.
                // If the user hasn't synced Razorpay to FinancialRecords, we should probably check both.
                const actualTotal = (financeRevenue._sum.amount || 0) + (razorpayRevenue._sum.amount || 0);
                const mismatch = Math.abs(reportedTotal - actualTotal);
                const isValid = mismatch < 1; // Tolerance for small rounding

                results.push({
                    date: currentDate.toISOString().split('T')[0],
                    reportedRevenue: reportedTotal,
                    actualRevenue: actualTotal,
                    financeRevenue: financeRevenue._sum.amount || 0,
                    razorpayRevenue: razorpayRevenue._sum.amount || 0,
                    mismatch,
                    isValid
                });
            }

            // If only 1 day requested, return as object for backward compatibility with Alert component, 
            // otherwise return the array for the table.
            return NextResponse.json(days === 1 ? results[0] : results);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
