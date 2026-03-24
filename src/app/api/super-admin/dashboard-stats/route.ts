import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { startOfMonth, subMonths, endOfMonth, format } from 'date-fns';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const safePercentDelta = (current: number, previous: number) => {
    if (!current && !previous) return { deltaPercent: 0, direction: 'neutral' as const, label: 'No baseline yet' };
    if (!previous) return { deltaPercent: 0, direction: 'neutral' as const, label: 'No prior period data' };

    const deltaPercent = Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
    return {
        deltaPercent,
        direction: deltaPercent > 0 ? 'up' as const : deltaPercent < 0 ? 'down' as const : 'neutral' as const,
        label: `vs previous ${deltaPercent >= 0 ? '+' : ''}${deltaPercent}%`
    };
};

export async function GET(req: NextRequest) {
    try {
        // 1. Auth Check - Super Admin Only
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized Access' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const period = parseInt(searchParams.get('period') || '6'); // Default 6 months

        const now = new Date();
        const startDate = startOfMonth(subMonths(now, period - 1));
        const previousStartDate = startOfMonth(subMonths(startDate, period));
        const previousEndDate = endOfMonth(subMonths(startDate, 1));

        // --- DOMAIN 1: FINANCE & REVENUE ---
        const invoiceStats = await prisma.invoice.groupBy({
            by: ['status'],
            _sum: { total: true },
            _count: { id: true }
        });

        const revenueTransactions = await prisma.revenueTransaction.groupBy({
            by: ['status'],
            _sum: { amount: true },
            _count: { id: true }
        });

        // Monthly Revenue Trend
        const monthlyInvoices = await prisma.invoice.findMany({
            where: {
                status: 'PAID',
                createdAt: { gte: startDate }
            },
            select: {
                total: true,
                createdAt: true
            }
        });

        const previousPeriodInvoices = await prisma.invoice.findMany({
            where: {
                status: 'PAID',
                createdAt: {
                    gte: previousStartDate,
                    lte: previousEndDate
                }
            },
            select: {
                total: true,
                createdAt: true
            }
        });

        const currentRevenueTotal = monthlyInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
        const previousRevenueTotal = previousPeriodInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

        const revenueTrend: Record<string, number> = {};
        for (let i = 0; i < period; i++) {
            const date = subMonths(now, i);
            const key = format(date, 'MMM yyyy');
            revenueTrend[key] = monthlyInvoices
                .filter(inv => format(inv.createdAt, 'MMM yyyy') === key)
                .reduce((sum, inv) => sum + (inv.total || 0), 0);
        }

        // --- DOMAIN 2: HUMAN RESOURCES ---
        const [headcountByCompany, previousHeadcountByCompany] = await Promise.all([
            prisma.company.findMany({
                select: {
                    name: true,
                    _count: {
                        select: { users: { where: { isActive: true } } }
                    }
                }
            }),
            prisma.company.findMany({
                select: {
                    name: true,
                    _count: {
                        select: {
                            users: {
                                where: {
                                    isActive: true,
                                    createdAt: {
                                        lte: previousEndDate
                                    }
                                }
                            }
                        }
                    }
                }
            })
        ]);

        const employeeTypeStats = await prisma.employeeProfile.groupBy({
            by: ['employeeType'],
            _count: { id: true }
        });

        const performanceSnapshots = await prisma.monthlyPerformanceSnapshot.findMany({
            where: {
                createdAt: { gte: subMonths(now, 1) } // Last month's performance
            },
            select: {
                companyId: true,
                overallScore: true,
                attendanceScore: true,
                taskCompletionRate: true
            }
        });

        const avgPerformance = performanceSnapshots.length > 0 
            ? performanceSnapshots.reduce((acc, s) => acc + s.overallScore, 0) / performanceSnapshots.length 
            : 0;
        const avgAttendance = performanceSnapshots.length > 0
            ? performanceSnapshots.reduce((acc: number, s: any) => acc + s.attendanceScore, 0) / performanceSnapshots.length
            : 0;

        const currentHeadcount = headcountByCompany.reduce((acc, c) => acc + c._count.users, 0);
        const previousHeadcount = previousHeadcountByCompany.reduce((acc, c) => acc + c._count.users, 0);

        // --- DOMAIN 3: IT & INFRASTRUCTURE ---
        const [itProjects, previousItProjects, itAssets, itTickets] = await Promise.all([
            prisma.iTProject.groupBy({
                by: ['status'],
                _count: { id: true }
            }),
            prisma.iTProject.groupBy({
                by: ['status'],
                where: {
                    createdAt: {
                        lte: previousEndDate
                    }
                },
                _count: { id: true }
            }),
            prisma.iTAsset.groupBy({
                by: ['status', 'type'],
                _count: { id: true }
            }),
            prisma.iTSupportTicket.groupBy({
                by: ['status'],
                _count: { id: true }
            })
        ]);
        const openProjectStatuses = ['ACTIVE', 'IN_PROGRESS', 'PLANNING', 'ON_HOLD'];
        const currentProjectCount = itProjects
            .filter((p: any) => openProjectStatuses.includes(String(p.status)))
            .reduce((acc: number, p: any) => acc + p._count.id, 0);
        const previousProjectCount = previousItProjects
            .filter((p: any) => openProjectStatuses.includes(String(p.status)))
            .reduce((acc: number, p: any) => acc + p._count.id, 0);
        const openTicketCount = itTickets
            .filter((t: any) => !['CLOSED', 'RESOLVED'].includes(String(t.status)))
            .reduce((acc: number, t: any) => acc + t._count.id, 0);

        // --- DOMAIN 4: PUBLICATION ---
        const journals = await prisma.journal.findMany({
            select: {
                id: true,
                name: true,
                impactFactor: true,
                _count: {
                    select: { articles: true }
                }
            },
            orderBy: { impactFactor: 'desc' },
            take: 5
        });

        const articleStatusTrend = await prisma.article.groupBy({
            by: ['status'],
            _count: { id: true }
        });
        const [currentArticleCount, previousArticleCount] = await Promise.all([
            prisma.article.count({
                where: {
                    createdAt: {
                        gte: startDate
                    }
                }
            }),
            prisma.article.count({
                where: {
                    createdAt: {
                        gte: previousStartDate,
                        lte: previousEndDate
                    }
                }
            })
        ]);

        // Recent Activity (Consolidated)
        const recentAuditLogs = await prisma.auditLog.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, role: true } } }
        });

        const revenueDelta = safePercentDelta(currentRevenueTotal, previousRevenueTotal);
        const workforceDelta = safePercentDelta(currentHeadcount, previousHeadcount);
        const projectDelta = safePercentDelta(currentProjectCount, previousProjectCount);
        const publicationDelta = safePercentDelta(currentArticleCount, previousArticleCount);

        const financeHealth = currentRevenueTotal > 0
            ? { status: 'healthy', label: `${monthlyInvoices.length} paid invoices in range` }
            : { status: 'neutral', label: 'No paid invoices in selected period' };

        const hrHealth = avgAttendance >= 85 && avgPerformance >= 75
            ? { status: 'healthy', label: 'Attendance and performance are stable' }
            : avgAttendance || avgPerformance
                ? { status: 'watch', label: 'Review workforce attendance and performance trends' }
                : { status: 'neutral', label: 'No recent performance snapshot data' };

        const itHealth = openTicketCount > currentProjectCount * 2 && openTicketCount > 0
            ? { status: 'watch', label: `${openTicketCount} open IT tickets need attention` }
            : { status: 'healthy', label: `${currentProjectCount} active projects, ${openTicketCount} open tickets` };

        const publicationHealth = currentArticleCount > 0
            ? { status: 'healthy', label: `${currentArticleCount} articles created in selected period` }
            : { status: 'neutral', label: 'No publication throughput in selected period' };

        return NextResponse.json({
            period,
            comparison: {
                currentStart: startDate,
                currentEnd: now,
                previousStart: previousStartDate,
                previousEnd: previousEndDate
            },
            kpis: {
                revenue: {
                    current: currentRevenueTotal,
                    previous: previousRevenueTotal,
                    deltaPercent: revenueDelta.deltaPercent,
                    direction: revenueDelta.direction,
                    comparisonLabel: revenueDelta.label
                },
                workforce: {
                    current: currentHeadcount,
                    previous: previousHeadcount,
                    deltaPercent: workforceDelta.deltaPercent,
                    direction: workforceDelta.direction,
                    comparisonLabel: workforceDelta.label
                },
                itProjects: {
                    current: currentProjectCount,
                    previous: previousProjectCount,
                    deltaPercent: projectDelta.deltaPercent,
                    direction: projectDelta.direction,
                    comparisonLabel: projectDelta.label
                },
                publication: {
                    current: currentArticleCount,
                    previous: previousArticleCount,
                    deltaPercent: publicationDelta.deltaPercent,
                    direction: publicationDelta.direction,
                    comparisonLabel: publicationDelta.label
                }
            },
            health: {
                overall: [financeHealth, hrHealth, itHealth, publicationHealth].some((item) => item.status === 'watch') ? 'watch' : 'healthy',
                finance: financeHealth,
                hr: hrHealth,
                it: itHealth,
                publication: publicationHealth
            },
            finance: {
                invoices: invoiceStats,
                transactions: revenueTransactions,
                revenueTrend: Object.entries(revenueTrend).map(([name, value]) => ({ name, value })).reverse(),
                summary: {
                    totalRevenue: currentRevenueTotal,
                    invoiceCount: monthlyInvoices.length
                }
            },
            hr: {
                headcount: headcountByCompany.map(c => ({ name: c.name, count: c._count.users })),
                employeeTypes: employeeTypeStats.map(s => ({ type: s.employeeType || 'Other', count: s._count.id })),
                metrics: {
                    avgPerformance,
                    avgAttendance
                }
            },
            it: {
                projects: itProjects.map((p: any) => ({ status: p.status, count: p._count.id })),
                assets: itAssets.map((a: any) => ({ type: (a as any).type, status: a.status, count: a._count.id })),
                tickets: itTickets.map((t: any) => ({ status: t.status, count: t._count.id }))
            },
            publication: {
                topJournals: journals.map(j => ({ name: j.name, impactFactor: j.impactFactor, articles: j._count.articles })),
                articles: articleStatusTrend.map(a => ({ status: a.status, count: a._count.id }))
            },
            recentActivity: recentAuditLogs.map(log => ({
                id: log.id,
                action: log.action,
                entity: log.entity,
                user: log.user?.name,
                role: log.user?.role,
                timestamp: log.createdAt
            }))
        });

    } catch (error: any) {
        logger.error('Super Admin Dashboard Stats Error:', error);
        return NextResponse.json({ 
            error: 'Internal Server Error', 
            details: error.message 
        }, { status: 500 });
    }
}
