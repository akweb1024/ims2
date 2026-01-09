import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '100');
        const offset = parseInt(searchParams.get('offset') || '0');

        const where: any = {};
        if (user.role !== 'SUPER_ADMIN') {
            where.companyId = user.companyId;
        }

        // Fetch payments with Razorpay data
        const [payments, total, lastSync] = await Promise.all([
            prisma.payment.findMany({
                where: {
                    ...where,
                    razorpayPaymentId: { not: null }
                },
                orderBy: { paymentDate: 'desc' },
                take: limit,
                skip: offset,
                include: {
                    company: { select: { name: true } },
                    invoice: {
                        include: {
                            subscription: {
                                include: { customerProfile: { select: { name: true } } }
                            }
                        }
                    }
                }
            }),
            prisma.payment.count({
                where: {
                    ...where,
                    razorpayPaymentId: { not: null }
                }
            }),
            prisma.razorpaySync.findFirst({
                orderBy: { lastSyncAt: 'desc' }
            })
        ]);

        // Transform payments to match Razorpay structure
        const transformedPayments = payments.map(p => {
            // Parse metadata if stored as JSON
            let metadata: any = {};
            try {
                metadata = p.metadata && typeof p.metadata === 'string' ? JSON.parse(p.metadata) : {};
            } catch (e) {
                metadata = {};
            }

            return {
                id: p.razorpayPaymentId || p.id,
                razorpayPaymentId: p.razorpayPaymentId,
                amount: p.amount,
                base_amount: metadata.base_amount || p.amount,
                base_currency: metadata.base_currency || 'INR',
                currency: p.currency || 'INR',
                status: p.status || 'unknown',
                method: p.paymentMethod || metadata.method || 'unknown',
                email: metadata.email || '',
                contact: metadata.contact || '',
                description: metadata.description || p.notes || '',
                international: metadata.international || false,
                created_at: Math.floor(new Date(p.paymentDate).getTime() / 1000),
                captured: p.status === 'captured',

                // Card details if available
                card: metadata.card || null,
                card_id: metadata.card_id || null,

                // Wallet info
                wallet: metadata.wallet || null,

                // Bank/UPI
                bank: metadata.bank || null,
                vpa: metadata.vpa || null,

                // Fees and tax
                fee: metadata.fee || 0,
                tax: metadata.tax || 0,

                // Acquirer data
                acquirer_data: metadata.acquirer_data || {},

                // Error info
                error_code: metadata.error_code || null,
                error_description: metadata.error_description || null,
                error_reason: metadata.error_reason || null,

                // Refund
                amount_refunded: metadata.amount_refunded || 0,
                refund_status: metadata.refund_status || null,

                // Relations
                company: p.company,
                invoice: p.invoice
            };
        });

        // Month-on-Month Comparison
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        const [currentMonthStats, lastMonthStats] = await Promise.all([
            prisma.payment.aggregate({
                where: {
                    ...where,
                    razorpayPaymentId: { not: null },
                    paymentDate: { gte: startOfCurrentMonth }
                },
                _sum: { amount: true }
            }),
            prisma.payment.aggregate({
                where: {
                    ...where,
                    razorpayPaymentId: { not: null },
                    paymentDate: { gte: startOfLastMonth, lte: endOfLastMonth }
                },
                _sum: { amount: true }
            })
        ]);

        const currentMonthRevenue = currentMonthStats._sum.amount || 0;
        const lastMonthRevenue = lastMonthStats._sum.amount || 0;
        const momGrowth = lastMonthRevenue === 0 ? 100 : ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

        // Currency Rates (Should be fetched from an API in production)
        const exchangeRates: Record<string, number> = {
            'INR': 1,
            'Paise': 0.01,
            'USD': 83.5,
            'EUR': 90.2,
            'GBP': 105.8,
            'AED': 22.7,
            'SGD': 61.5,
            'AUD': 55.4,
            'CAD': 61.2,
            'JPY': 0.56,
            'CNY': 11.5
        };

        // Get total revenue in INR
        let totalRevenueINR = 0;
        const currencyMap = new Map<string, { amount: number, count: number }>();

        payments.forEach(p => {
            // Goal 1: Exclude FAILED status from revenue
            if (p.status === 'failed') return;

            const curr = (p.currency || 'INR').toUpperCase();
            const rate = exchangeRates[curr] || 1;
            const inrValue = p.amount * rate;
            totalRevenueINR += inrValue;

            const existing = currencyMap.get(curr) || { amount: 0, count: 0 };
            currencyMap.set(curr, {
                amount: existing.amount + p.amount,
                count: existing.count + 1
            });
        });

        const revenueByCurrency = Array.from(currencyMap.entries()).map(([currency, data]) => ({
            currency,
            amount: data.amount,
            count: data.count,
            inrEquivalent: data.amount * (exchangeRates[currency] || 1)
        }));

        // Goal 3: Daily Revenue Trend with Status Split
        const dailyRevenue: any[] = await prisma.$queryRaw`
            SELECT 
                CAST("paymentDate" AS DATE) as date,
                SUM(CASE WHEN status != 'failed' THEN amount ELSE 0 END) as total_revenue,
                SUM(CASE WHEN status = 'captured' THEN amount ELSE 0 END) as captured_revenue,
                SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as failed_revenue
            FROM "Payment"
            WHERE "razorpayPaymentId" IS NOT NULL
            ${user.role !== 'SUPER_ADMIN' ? Prisma.sql`AND "companyId" = ${user.companyId}` : Prisma.empty}
            GROUP BY CAST("paymentDate" AS DATE)
            ORDER BY date DESC
            LIMIT 60
        `;

        // Process daily revenue to INR for charts
        const processedDaily = dailyRevenue.map((curr: any) => {
            const dateStr = curr.date.toISOString().split('T')[0];
            return {
                date: dateStr,
                revenue: curr.total_revenue,
                captured: curr.captured_revenue,
                failed: curr.failed_revenue
            };
        }).slice(0, 30);

        return NextResponse.json({
            payments: transformedPayments,
            total,
            stats: {
                totalRevenue: totalRevenueINR,
                revenueByCurrency,
                totalCount: total || 0,
                currentMonthRevenue: currentMonthRevenue,
                lastMonthRevenue: lastMonthRevenue,
                momGrowth: momGrowth.toFixed(1)
            },
            lastSync,
            dailyRevenue: processedDaily
        });

    } catch (error: any) {
        console.error('Razorpay Tracker API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
