
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-legacy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const user = await getAuthenticatedUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const allowedRoles = ['TEAM_LEADER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN', 'HR_MANAGER'];
        if (!allowedRoles.includes(user.role)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const period = searchParams.get('period') || 'month';
        const departmentId = searchParams.get('departmentId');
        const companyId = user.companyId;

        if (!companyId) {
            return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        }

        // Calculate date range
        const now = new Date();
        let startDate: Date;

        switch (period) {
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'quarter':
                const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
                startDate = new Date(now.getFullYear(), quarterStartMonth, 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            case 'all':
                startDate = new Date(2020, 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        // 1. Payment Gateway Revenue
        const payments = await prisma.payment.findMany({
            where: {
                companyId,
                paymentDate: { gte: startDate },
                status: { in: ['captured', 'SUCCESS', 'COMPLETED'] }
            },
            select: { amount: true, paymentMethod: true }
        });
        const totalPaymentRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

        // 2. Work Report Revenue
        const workReportWhere: any = {
            companyId,
            date: { gte: startDate }
        };
        if (departmentId && !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
            workReportWhere.employee = { user: { departmentId } };
        }
        const workReports = await prisma.workReport.findMany({
            where: workReportWhere,
            select: {
                revenueGenerated: true,
                employee: {
                    select: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                                department: { select: { name: true } }
                            }
                        }
                    }
                }
            }
        });
        const totalWorkReportRevenue = workReports.reduce((sum, r) => sum + (r.revenueGenerated || 0), 0);

        // 3. Invoice Revenue
        const invoices = await prisma.invoice.findMany({
            where: {
                companyId,
                createdAt: { gte: startDate },
                status: { in: ['PAID', 'PARTIALLY_PAID'] }
            },
            select: { total: true }
        });
        const totalInvoiceRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);

        // 4. Performance Revenue
        const performanceSnapshots = await prisma.monthlyPerformanceSnapshot.findMany({
            where: {
                companyId,
                calculatedAt: { gte: startDate }
            },
            select: { totalRevenueGenerated: true }
        });
        const totalPerformanceRevenue = performanceSnapshots.reduce((sum, s) => sum + s.totalRevenueGenerated, 0);

        // Aggregations
        const revenueByDepartment: Record<string, number> = {};
        workReports.forEach(report => {
            const deptName = report.employee.user.department?.name || 'Unassigned';
            revenueByDepartment[deptName] = (revenueByDepartment[deptName] || 0) + (report.revenueGenerated || 0);
        });

        // Trends (simplified for now to basic total for month/period to avoid complex loops)
        // Re-implementing simplified monthly trend
        const monthlyTrend = [];
        for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

            const monthReports = await prisma.workReport.findMany({
                where: {
                    companyId,
                    date: { gte: monthDate, lte: monthEnd }
                },
                select: { revenueGenerated: true }
            });
            const monthRevenue = monthReports.reduce((sum, r) => sum + (r.revenueGenerated || 0), 0);
            monthlyTrend.push({
                month: monthDate.toLocaleString('default', { month: 'short', year: 'numeric' }),
                revenue: monthRevenue
            });
        }

        // Top Performers
        const employeeRevenue: Record<string, { name: string; revenue: number; email: string }> = {};
        workReports.forEach(report => {
            const email = report.employee.user.email;
            const name = report.employee.user.name || email;
            if (!employeeRevenue[email]) {
                employeeRevenue[email] = { name, revenue: 0, email };
            }
            employeeRevenue[email].revenue += report.revenueGenerated || 0;
        });
        const topPerformers = Object.values(employeeRevenue)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        // Payment Methods
        const paymentMethodBreakdown: Record<string, number> = {};
        payments.forEach(payment => {
            const method = payment.paymentMethod || 'Unknown';
            paymentMethodBreakdown[method] = (paymentMethodBreakdown[method] || 0) + payment.amount;
        });

        const totalRevenue = Math.max(
            totalPaymentRevenue,
            totalWorkReportRevenue,
            totalInvoiceRevenue,
            totalPerformanceRevenue
        );

        return NextResponse.json({
            summary: {
                totalRevenue,
                paymentRevenue: totalPaymentRevenue,
                workReportRevenue: totalWorkReportRevenue,
                invoiceRevenue: totalInvoiceRevenue,
                performanceRevenue: totalPerformanceRevenue,
                period,
                startDate,
                endDate: now
            },
            breakdown: {
                byDepartment: Object.entries(revenueByDepartment).map(([name, revenue]) => ({ name, revenue })),
                byPaymentMethod: Object.entries(paymentMethodBreakdown).map(([method, amount]) => ({ method, amount })),
                topPerformers
            },
            trends: {
                monthly: monthlyTrend
            },
            counts: {
                totalPayments: payments.length,
                totalInvoices: invoices.length,
                totalReports: workReports.length
            }
        });

    } catch (error: any) {
        console.error('Revenue analytics error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
