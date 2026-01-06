import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();
        if (!user || !['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'MANAGER'].includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const offset = parseInt(searchParams.get('offset') || '0');

        const where: any = {};
        if (user.role !== 'SUPER_ADMIN') {
            where.companyId = user.companyId;
        }

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

        // Currency Rates (Approximate Real-time for demonstration, ideally from an API)
        const exchangeRates: Record<string, number> = {
            'INR': 1,
            'Paise': 0.01,
            'USD': 83.5,
            'EUR': 90.2,
            'GBP': 105.8,
            'AED': 22.7,
            'SGD': 61.5,
            'AUD': 55.4,
            'CAD': 61.2
        };

        // Aggregated Stats by Currency
        const currencyStats = await prisma.payment.groupBy({
            by: ['currency'],
            where: {
                ...where,
                razorpayPaymentId: { not: null }
            },
            _sum: { amount: true },
            _count: { id: true }
        });

        let totalRevenueINR = 0;
        const revenueByCurrency = currencyStats.map(c => {
            const currency = (c.currency || 'INR').toUpperCase();
            const amount = c._sum.amount || 0;
            const rate = exchangeRates[currency] || 1;
            const inrValue = amount * rate;
            totalRevenueINR += inrValue;

            return {
                currency,
                amount,
                count: c._count.id,
                inrEquivalent: inrValue
            };
        });

        // Company Comparison (For Super Admins)
        let companyComparison: any[] = [];
        if (user.role === 'SUPER_ADMIN') {
            const rawCompanyComparison = await prisma.payment.groupBy({
                by: ['companyId', 'currency'],
                where: { razorpayPaymentId: { not: null } },
                _sum: { amount: true },
                _count: { id: true },
            });

            // Fetch company names
            const companies = await prisma.company.findMany({
                where: { id: { in: rawCompanyComparison.map((c: any) => c.companyId).filter((id: any) => id !== null) as string[] } },
                select: { id: true, name: true }
            });

            companyComparison = rawCompanyComparison.map((stat: any) => {
                const currency = (stat.currency || 'INR').toUpperCase();
                const amount = stat._sum.amount || 0;
                const rate = exchangeRates[currency] || 1;

                return {
                    ...stat,
                    currency,
                    inrValue: amount * rate,
                    companyName: companies.find((c: any) => c.id === stat.companyId)?.name || 'Unknown'
                };
            });
        }

        const dailyRevenue: any[] = await prisma.$queryRaw`
            SELECT 
                CAST("paymentDate" AS DATE) as date,
                currency,
                SUM(amount) as revenue
            FROM "Payment"
            WHERE "razorpayPaymentId" IS NOT NULL
            ${user.role !== 'SUPER_ADMIN' ? Prisma.sql`AND "companyId" = ${user.companyId}` : Prisma.empty}
            GROUP BY CAST("paymentDate" AS DATE), currency
            ORDER BY date DESC
            LIMIT 60
        `;

        // Process daily revenue to INR for charts
        const processedDaily = dailyRevenue.reduce((acc: any[], curr: any) => {
            const dateStr = curr.date.toISOString().split('T')[0];
            const existing = acc.find(a => a.date === dateStr);
            const rate = exchangeRates[(curr.currency || 'INR').toUpperCase()] || 1;
            const inrVal = curr.revenue * rate;

            if (existing) {
                existing.revenue += inrVal;
            } else {
                acc.push({ date: dateStr, revenue: inrVal });
            }
            return acc;
        }, []).slice(0, 30);

        return NextResponse.json({
            payments,
            total,
            stats: {
                totalRevenue: totalRevenueINR, // Combined in INR
                revenueByCurrency, // Split by original currency
                totalCount: total || 0,
                currentMonthRevenue,
                lastMonthRevenue,
                momGrowth: momGrowth.toFixed(1)
            },
            lastSync,
            dailyRevenue: processedDaily,
            companyComparison
        });

    } catch (error: any) {
        console.error('Razorpay Tracker API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
