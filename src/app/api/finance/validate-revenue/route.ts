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
                const razorpayPayments = await prisma.payment.findMany({
                    where: {
                        companyId: user.companyId,
                        status: 'captured',
                        paymentDate: { gte: start, lte: end }
                    }
                });

                // Deduplicate: If a Razorpay payment is already recorded as a FinancialRecord (via referenceId), 
                // we should not count it twice.
                const financeRecords = await prisma.financialRecord.findMany({
                    where: {
                        companyId: user.companyId,
                        type: 'REVENUE',
                        date: { gte: start, lte: end },
                        status: 'COMPLETED'
                    }
                });

                const financeTotal = financeRecords.reduce((sum, r) => sum + (r.amount || 0), 0);
                const existingRefIds = new Set(financeRecords.map(r => r.referenceId).filter(Boolean));

                // Payment.amount is in the payment's OWN currency, so summing it straight into an
                // INR total counted a $500 payment as ₹500. Convert with the payment's stored
                // conversionRate; a foreign payment with no usable rate is excluded and reported
                // rather than silently understating the total by ~85x.
                const convertible = razorpayPayments
                    .filter(p => !existingRefIds.has(p.razorpayPaymentId) && !existingRefIds.has(p.transactionId));

                const unconvertedPayments = convertible.filter(
                    p => (p.currency || 'INR') !== 'INR' && !(p.conversionRate && p.conversionRate > 0)
                );

                const uniqueRazorpayRevenue = convertible
                    .filter(p => !unconvertedPayments.includes(p))
                    .reduce((sum, p) => {
                        const rate = (p.currency || 'INR') === 'INR' ? 1 : (p.conversionRate || 0);
                        return sum + (p.amount || 0) * rate;
                    }, 0);

                const reportedTotal = workReportRevenue._sum.revenueGenerated || 0;
                const actualTotal = financeTotal + uniqueRazorpayRevenue;
                const mismatch = Math.abs(reportedTotal - actualTotal);
                // A day with foreign payments we could not convert has an incomplete actual
                // total, so it cannot be called valid however close the numbers look.
                const isValid = mismatch < 1 && unconvertedPayments.length === 0;

                results.push({
                    date: currentDate.toISOString().split('T')[0],
                    reportedRevenue: reportedTotal,
                    actualRevenue: actualTotal,
                    financeRevenue: financeTotal,
                    razorpayRevenue: uniqueRazorpayRevenue,
                    mismatch,
                    isValid,
                    unconvertedPayments: unconvertedPayments.length,
                    unconvertedCurrencies: [...new Set(unconvertedPayments.map(p => p.currency || 'INR'))],
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

// Style guide accessibility compliance helper comment: aria-label placeholder label
