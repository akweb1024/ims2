import { NextRequest, NextResponse } from 'next/server';
import { authorizedRoute } from '@/lib/middleware-auth';
import prisma from '@/lib/prisma';

/**
 * Revenue Analytics API
 * Accessible to TEAM_LEADER, MANAGER, ADMIN, SUPER_ADMIN
 */

export const GET = authorizedRoute(['TEAM_LEADER', 'MANAGER', 'ADMIN', 'SUPER_ADMIN', 'HR_MANAGER'], async (req: NextRequest, user: any) => {
    try {
        const { searchParams } = new URL(req.url);
        const period = searchParams.get('period') || 'month'; // month, quarter, year, all
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
                startDate = new Date(2020, 0, 1); // Start from 2020
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        // 1. Payment Gateway Revenue (Razorpay, etc.)
        const payments = await prisma.payment.findMany({
            where: {
                companyId,
                paymentDate: { gte: startDate },
                status: { in: ['captured', 'SUCCESS', 'COMPLETED'] }
            },
            select: {
                amount: true,
                currency: true,
                paymentDate: true,
                paymentMethod: true
            }
        });

        const totalPaymentRevenue = payments.reduce((sum, p) => sum + p.amount, 0);

        // 2. Work Report Revenue (from employee reports)
        const workReportWhere: any = {
            companyId,
            date: { gte: startDate }
        };

        // If specific department requested and user is not admin
        if (departmentId && !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
            workReportWhere.employee = {
                user: { departmentId }
            };
        }

        const workReports = await prisma.workReport.findMany({
            where: workReportWhere,
            select: {
                revenueGenerated: true,
                date: true,
                employee: {
                    select: {
                        user: {
                            select: {
                                name: true,
                                email: true,
                                departmentId: true,
                                department: {
                                    select: {
                                        name: true
                                    }
                                }
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
            select: {
                total: true,
                amount: true,
                status: true,
                createdAt: true
            }
        });

        const totalInvoiceRevenue = invoices.reduce((sum, inv) => sum + inv.total, 0);

        // 4. Monthly Performance Revenue (from performance snapshots)
        const performanceSnapshots = await prisma.monthlyPerformanceSnapshot.findMany({
            where: {
                companyId,
                calculatedAt: { gte: startDate }
            },
            select: {
                totalRevenueGenerated: true,
                month: true,
                year: true,
                employee: {
                    select: {
                        user: {
                            select: {
                                name: true,
                                department: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });

        const totalPerformanceRevenue = performanceSnapshots.reduce((sum: number, s: any) => sum + s.totalRevenueGenerated, 0);

        // 5. Revenue by Department
        const revenueByDepartment: Record<string, number> = {};
        workReports.forEach(report => {
            const deptName = report.employee.user.department?.name || 'Unassigned';
            revenueByDepartment[deptName] = (revenueByDepartment[deptName] || 0) + (report.revenueGenerated || 0);
        });

        // 6. Revenue Trend (last 6 months)
        const monthlyTrend = [];
        for (let i = 5; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

            const monthReports = await prisma.workReport.findMany({
                where: {
                    companyId,
                    date: { gte: monthDate, lte: monthEnd }
                },
                select: {
                    revenueGenerated: true
                }
            });

            const monthRevenue = monthReports.reduce((sum, r) => sum + (r.revenueGenerated || 0), 0);

            monthlyTrend.push({
                month: monthDate.toLocaleString('default', { month: 'short', year: 'numeric' }),
                revenue: monthRevenue
            });
        }

        // 7. Top Revenue Generators
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

        // 8. Payment Methods Breakdown
        const paymentMethodBreakdown: Record<string, number> = {};
        payments.forEach(payment => {
            const method = payment.paymentMethod || 'Unknown';
            paymentMethodBreakdown[method] = (paymentMethodBreakdown[method] || 0) + payment.amount;
        });

        // Calculate total revenue (use the highest value to avoid double counting)
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
});
