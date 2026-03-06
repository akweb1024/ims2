import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';
import { startOfMonth, subMonths, endOfMonth, format } from 'date-fns';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

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

        const revenueTrend: Record<string, number> = {};
        for (let i = 0; i < period; i++) {
            const date = subMonths(now, i);
            const key = format(date, 'MMM yyyy');
            revenueTrend[key] = monthlyInvoices
                .filter(inv => format(inv.createdAt, 'MMM yyyy') === key)
                .reduce((sum, inv) => sum + (inv.total || 0), 0);
        }

        // --- DOMAIN 2: HUMAN RESOURCES ---
        const headcountByCompany = await prisma.company.findMany({
            select: {
                name: true,
                _count: {
                    select: { users: { where: { isActive: true } } }
                }
            }
        });

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

        // --- DOMAIN 3: IT & INFRASTRUCTURE ---
        const itProjects = await prisma.iTProject.groupBy({
            by: ['status'],
            _count: { id: true }
        });

        const itAssets = await prisma.iTAsset.groupBy({
            by: ['status', 'type'],
            _count: { id: true }
        });

        const itTickets = await prisma.iTSupportTicket.groupBy({
            by: ['status'],
            _count: { id: true }
        });

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

        // Recent Activity (Consolidated)
        const recentAuditLogs = await prisma.auditLog.findMany({
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true, role: true } } }
        });

        return NextResponse.json({
            finance: {
                invoices: invoiceStats,
                transactions: revenueTransactions,
                revenueTrend: Object.entries(revenueTrend).map(([name, value]) => ({ name, value })).reverse(),
                summary: {
                    totalRevenue: monthlyInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0),
                    invoiceCount: monthlyInvoices.length
                }
            },
            hr: {
                headcount: headcountByCompany.map(c => ({ name: c.name, count: c._count.users })),
                employeeTypes: employeeTypeStats.map(s => ({ type: s.employeeType || 'Other', count: s._count.id })),
                metrics: {
                    avgPerformance,
                    avgAttendance: performanceSnapshots.length > 0 
                        ? performanceSnapshots.reduce((acc: number, s: any) => acc + s.attendanceScore, 0) / performanceSnapshots.length 
                        : 0
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
