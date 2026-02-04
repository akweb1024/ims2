import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'MANAGER', 'EMPLOYEE'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '100');
        const offset = parseInt(searchParams.get('offset') || '0');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        const where: any = {
            razorpayPaymentId: { not: null }
        };

        if (startDate || endDate) {
            where.paymentDate = {};
            if (startDate) where.paymentDate.gte = new Date(startDate);
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.paymentDate.lte = end;
            }
        }

        // Fetch payments with Razorpay data
        const [payments, total, lastSync] = await Promise.all([
            prisma.payment.findMany({
                where,
                orderBy: { paymentDate: 'desc' },
                take: limit,
                skip: offset,
                include: {
                    company: { select: { name: true } },
                    invoice: {
                        include: {
                            subscription: {
                                include: { customerProfile: { select: { name: true, primaryEmail: true } } }
                            }
                        }
                    },
                    revenueTransactions: {
                        include: {
                            claims: {
                                include: {
                                    employee: {
                                        select: {
                                            user: { select: { name: true } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }),
            prisma.payment.count({ where }),
            prisma.razorpaySync.findFirst({
                orderBy: { lastSyncAt: 'desc' }
            })
        ]);

        // Transform payments for frontend
        const transformedPayments = (payments as any[]).map(p => {
            let metadata: any = {};
            try {
                metadata = p.metadata && typeof p.metadata === 'string' ? JSON.parse(p.metadata) : {};
            } catch (e) {
                metadata = {};
            }

            const customerName = p.invoice?.subscription?.customerProfile?.name ||
                metadata.notes?.name ||
                metadata.notes?.customer_name ||
                (metadata.card?.name && metadata.card.name !== 'Razorpay User' ? metadata.card.name : null) ||
                '';

            const betterDescription = metadata.description ||
                metadata.notes?.description ||
                metadata.notes?.reason ||
                p.notes ||
                '';

            return {
                id: p.razorpayPaymentId || p.id,
                razorpayPaymentId: p.razorpayPaymentId,
                amount: p.amount, // Already scaled in DB (sync route divides by 100)
                base_amount: metadata.base_amount || p.amount,
                base_currency: metadata.base_currency || 'INR',
                currency: p.currency || 'INR',
                status: p.status || 'unknown',
                method: p.paymentMethod || metadata.method || 'unknown',
                name: customerName,
                email: metadata.email || p.invoice?.subscription?.customerProfile?.primaryEmail || '',
                contact: metadata.contact || '',
                description: betterDescription,
                international: metadata.international || false,
                created_at: Math.floor(new Date(p.paymentDate).getTime() / 1000),
                captured: p.status === 'captured',
                card: metadata.card || null,
                card_id: metadata.card_id || null,
                wallet: metadata.wallet || null,
                bank: metadata.bank || null,
                vpa: metadata.vpa || null,
                fee: metadata.fee || 0,
                tax: metadata.tax || 0,
                acquirer_data: metadata.acquirer_data || {},
                error_code: metadata.error_code || null,
                error_description: metadata.error_description || null,
                error_reason: metadata.error_reason || null,
                company: p.company,
                invoice: p.invoice,
                revenueTransaction: p.revenueTransactions?.[0] || null,
                claims: p.revenueTransactions?.[0]?.claims.map((c: any) => ({
                    id: c.id,
                    status: c.status,
                    employeeName: c.employee?.user?.name,
                    claimDate: c.claimDate
                })) || []
            };
        });

        // Aggregations for Monthly/Yearly tables
        const [monthlyAggRaw, yearlyAggRaw] = await Promise.all([
            prisma.$queryRaw`
                SELECT 
                    TO_CHAR("paymentDate", 'YYYY-MM') as period,
                    SUM(amount) as total,
                    COUNT(*)::integer as count,
                    SUM(CASE WHEN status = 'captured' THEN amount ELSE 0 END) as captured,
                    SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as failed
                FROM "Payment"
                WHERE "razorpayPaymentId" IS NOT NULL
                GROUP BY period
                ORDER BY period DESC
            `,
            prisma.$queryRaw`
                SELECT 
                    TO_CHAR("paymentDate", 'YYYY') as period,
                    SUM(amount) as total,
                    COUNT(*)::integer as count,
                    SUM(CASE WHEN status = 'captured' THEN amount ELSE 0 END) as captured,
                    SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) as failed
                FROM "Payment"
                WHERE "razorpayPaymentId" IS NOT NULL
                GROUP BY period
                ORDER BY period DESC
            `
        ]);

        const monthlyAgg = Array.isArray(monthlyAggRaw) ? monthlyAggRaw : [];
        const yearlyAgg = Array.isArray(yearlyAggRaw) ? yearlyAggRaw : [];

        // Month-on-Month Comparison
        const now = new Date();
        const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        const [currentMonthStats, lastMonthStats] = await Promise.all([
            prisma.payment.aggregate({
                where: { ...where, status: 'captured', paymentDate: { gte: startOfCurrentMonth } },
                _sum: { amount: true }
            }),
            prisma.payment.aggregate({
                where: { ...where, status: 'captured', paymentDate: { gte: startOfLastMonth, lte: endOfLastMonth } },
                _sum: { amount: true }
            })
        ]);

        const currentMonthRevenue = (currentMonthStats._sum.amount || 0); // Already in units
        const lastMonthRevenue = (lastMonthStats._sum.amount || 0); // Already in units

        // Currency handling logic
        const exchangeRates: Record<string, number> = {
            'INR': 1, 'USD': 83.5, 'EUR': 90.2, 'GBP': 105.8, 'AED': 22.7, 'SGD': 61.5,
            'AUD': 55.4, 'CAD': 61.2, 'JPY': 0.56, 'CNY': 11.5
        };

        let totalRevenueINR = 0;
        const currencyMap = new Map<string, { amount: number, count: number }>();

        // We fetch captured payments for global stats
        const allCapturedPayments = await prisma.payment.findMany({
            where: { ...where, status: 'captured' },
            select: { amount: true, currency: true }
        });

        allCapturedPayments.forEach(p => {
            const curr = (p.currency || 'INR').toUpperCase();
            const rate = exchangeRates[curr] || 1;
            totalRevenueINR += p.amount * rate;

            const existing = currencyMap.get(curr) || { amount: 0, count: 0 };
            currencyMap.set(curr, {
                amount: existing.amount + p.amount,
                count: existing.count + 1
            });
        });

        const momGrowth = lastMonthRevenue === 0 ? 100 : ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;

        const revenueByCurrency = Array.from(currencyMap.entries()).map(([currency, data]) => ({
            currency,
            amount: data.amount,
            count: data.count,
            inrEquivalent: data.amount * (exchangeRates[currency] || 1)
        }));

        const dailyRevenueRaw: any[] = await prisma.$queryRaw`
            SELECT 
                "paymentDate"::date as date,
                SUM(amount)::numeric as total_revenue,
                SUM(CASE WHEN status = 'captured' THEN amount ELSE 0 END)::numeric as captured_revenue,
                SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END)::numeric as failed_revenue
            FROM "Payment"
            WHERE "razorpayPaymentId" IS NOT NULL
            GROUP BY date
            ORDER BY date DESC
            LIMIT 60
        `;

        const dailyRevenue = Array.isArray(dailyRevenueRaw) ? dailyRevenueRaw : [];
        const processedDaily = dailyRevenue.map((curr: any) => ({
            date: curr.date instanceof Date ? curr.date.toISOString().split('T')[0] : String(curr.date),
            revenue: (Number(curr.total_revenue) || 0),
            captured: (Number(curr.captured_revenue) || 0),
            failed: (Number(curr.failed_revenue) || 0)
        })).slice(0, 30);

        return NextResponse.json({
            payments: transformedPayments,
            total,
            stats: {
                totalRevenue: totalRevenueINR,
                revenueByCurrency,
                totalCount: total || 0,
                currentMonthRevenue,
                lastMonthRevenue,
                momGrowth: parseFloat(momGrowth.toFixed(1))
            },
            monthlySummaries: monthlyAgg.map((m: any) => ({ ...m, total: Number(m.total), captured: Number(m.captured), failed: Number(m.failed) })),
            yearlySummaries: yearlyAgg.map((y: any) => ({ ...y, total: Number(y.total), captured: Number(y.captured), failed: Number(y.failed) })),
            lastSync,
            dailyRevenue: processedDaily
        });

    } catch (error: any) {
        console.error('Razorpay Tracker API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
