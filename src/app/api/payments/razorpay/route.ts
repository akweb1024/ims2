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

        // Total Stats Aggregation
        const stats = await prisma.payment.aggregate({
            where: {
                ...where,
                razorpayPaymentId: { not: null }
            },
            _sum: { amount: true },
            _count: { id: true }
        });

        // Company Comparison (For Super Admins)
        let companyComparison: any[] = [];
        if (user.role === 'SUPER_ADMIN') {
            const rawCompanyComparison = await prisma.payment.groupBy({
                by: ['companyId'],
                where: { razorpayPaymentId: { not: null } },
                _sum: { amount: true },
                _count: { id: true },
            });

            // Fetch company names
            const companies = await prisma.company.findMany({
                where: { id: { in: rawCompanyComparison.map((c: any) => c.companyId).filter((id: any) => id !== null) as string[] } },
                select: { id: true, name: true }
            });

            companyComparison = rawCompanyComparison.map((stat: any) => ({
                ...stat,
                companyName: companies.find((c: any) => c.id === stat.companyId)?.name || 'Unknown'
            }));
        }

        const dailyRevenue: any[] = await prisma.$queryRaw`
            SELECT 
                CAST("paymentDate" AS DATE) as date,
                SUM(amount) as revenue
            FROM "Payment"
            WHERE "razorpayPaymentId" IS NOT NULL
            ${user.role !== 'SUPER_ADMIN' ? Prisma.sql`AND "companyId" = ${user.companyId}` : Prisma.empty}
            GROUP BY CAST("paymentDate" AS DATE)
            ORDER BY date DESC
            LIMIT 30
        `;

        return NextResponse.json({
            payments,
            total,
            stats: {
                totalRevenue: stats._sum.amount || 0,
                totalCount: stats._count.id || 0,
                currentMonthRevenue,
                lastMonthRevenue,
                momGrowth: momGrowth.toFixed(1)
            },
            lastSync,
            dailyRevenue,
            companyComparison
        });

    } catch (error: any) {
        console.error('Razorpay Tracker API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
