import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        // 1. Strict Auth Check
        const user = await getAuthenticatedUser();
        if (!user || user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized Access' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const period = parseInt(searchParams.get('period') || '12');

        // 2. Fetch All Companies
        const companies = await prisma.company.findMany({
            select: { id: true, name: true, logoUrl: true, createdAt: true }
        });

        // 3. Financial Overview with Monthly Trends
        const startDate = new Date(Date.now() - period * 30 * 24 * 60 * 60 * 1000);

        const revenueByCompany = await prisma.invoice.groupBy({
            by: ['companyId', 'createdAt'],
            where: {
                status: 'PAID',
                createdAt: { gte: startDate }
            },
            _sum: { total: true }
        });

        // Calculate monthly revenue trends
        const monthlyRevenueTrend: Record<string, Record<string, number>> = {};
        revenueByCompany.forEach(r => {
            const comp = companies.find(c => c.id === r.companyId);
            if (!comp) return;

            const monthKey = new Date(r.createdAt).toISOString().slice(0, 7);
            if (!monthlyRevenueTrend[comp.name]) {
                monthlyRevenueTrend[comp.name] = {};
            }
            monthlyRevenueTrend[comp.name][monthKey] = (monthlyRevenueTrend[comp.name][monthKey] || 0) + (r._sum.total || 0);
        });

        const financialData = companies.map(comp => {
            const rev = revenueByCompany.filter(r => r.companyId === comp.id);
            const totalRevenue = rev.reduce((acc, r) => acc + (r._sum.total || 0), 0);

            // Calculate growth (compare last month vs previous)
            const lastMonthKey = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7);
            const prevMonthKey = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 7);
            const lastMonthRev = monthlyRevenueTrend[comp.name]?.[lastMonthKey] || 0;
            const prevMonthRev = monthlyRevenueTrend[comp.name]?.[prevMonthKey] || 0;
            const growthRate = prevMonthRev > 0 ? ((lastMonthRev - prevMonthRev) / prevMonthRev * 100).toFixed(1) : '0';

            return {
                companyId: comp.id,
                companyName: comp.name,
                totalRevenue,
                status: totalRevenue > 0 ? 'In Revenue' : 'Pre-Revenue',
                lastMonthRevenue: lastMonthRev,
                growthRate: parseFloat(growthRate as string),
                monthlyTrend: monthlyRevenueTrend[comp.name] || {}
            };
        });

        // 4. Employee Demographics & Trends
        const allProfiles = await prisma.employeeProfile.findMany({
            include: {
                user: {
                    select: {
                        companyId: true,
                        managerId: true,
                        departmentId: true,
                        name: true,
                        isActive: true,
                        createdAt: true,
                        department: { select: { name: true } }
                    }
                }
            }
        });

        // Calculate company stats
        const companyEmployeeStats: Record<string, any> = {};
        const salaryByDept: Record<string, number> = {};
        const salaryByManager: Record<string, number> = {};
        const managerNames: Record<string, string> = {};
        const monthlyHeadcountTrend: Record<string, Record<string, number>> = {};

        // Get all active users for headcount
        const allUsers = await prisma.user.findMany({
            where: { isActive: true },
            select: { id: true, companyId: true, createdAt: true, name: true }
        });

        // Calculate monthly headcount
        allUsers.forEach(u => {
            if (!u.companyId) return;
            const comp = companies.find(c => c.id === u.companyId);
            if (!comp) return;

            const monthKey = u.createdAt.toISOString().slice(0, 7);
            if (!monthlyHeadcountTrend[comp.name]) {
                monthlyHeadcountTrend[comp.name] = {};
            }
            monthlyHeadcountTrend[comp.name][monthKey] = (monthlyHeadcountTrend[comp.name][monthKey] || 0) + 1;
        });

        const globalBreakdown = { fixed: 0, variable: 0, incentive: 0 };

        allProfiles.forEach(p => {
            const compId = p.user.companyId;
            if (!compId) return;
            const comp = companies.find(c => c.id === compId);
            if (!comp) return;

            // Init Company Stats
            if (!companyEmployeeStats[compId]) {
                companyEmployeeStats[compId] = {
                    companyId: compId,
                    total: 0,
                    types: {},
                    avgSalary: 0,
                    totalSalary: 0
                };
            }

            // Count Types
            const type = p.employeeType || 'UNKNOWN';
            companyEmployeeStats[compId].types[type] = (companyEmployeeStats[compId].types[type] || 0) + 1;
            companyEmployeeStats[compId].total++;

            // Salary Analysis (using standardized fields)
            const fixed = p.salaryFixed || 0;
            const variable = p.salaryVariable || 0;
            const incentive = p.salaryIncentive || 0;
            const monthlySalary = fixed + variable + incentive;

            companyEmployeeStats[compId].totalSalary += monthlySalary;

            // Global Breakdown
            globalBreakdown.fixed += fixed;
            globalBreakdown.variable += variable;
            globalBreakdown.incentive += incentive;

            // By Dept
            const deptName = p.user.department?.name || 'Unassigned';
            salaryByDept[deptName] = (salaryByDept[deptName] || 0) + monthlySalary;

            // By Manager
            if (p.user.managerId) {
                salaryByManager[p.user.managerId] = (salaryByManager[p.user.managerId] || 0) + monthlySalary;
            }
        });

        // Calculate avg salary per company
        Object.keys(companyEmployeeStats).forEach(compId => {
            const stats = companyEmployeeStats[compId];
            stats.avgSalary = stats.total > 0 ? stats.totalSalary / stats.total : 0;
        });

        // Resolve Manager Names
        const managerIds = Object.keys(salaryByManager);
        const managers = await prisma.user.findMany({
            where: { id: { in: managerIds } },
            select: { id: true, name: true, companyId: true }
        });
        managers.forEach(m => {
            managerNames[m.id] = m.name || 'Unknown Manager';
        });

        const managerSalaryAnalysis = managers
            .map(m => ({
                managerId: m.id,
                managerName: m.name,
                companyId: m.companyId,
                totalExpenditure: salaryByManager[m.id] || 0
            }))
            .sort((a, b) => b.totalExpenditure - a.totalExpenditure)
            .slice(0, 10);

        // 5. Executive Summary Calculations (MD View)
        const totalGroupRevenue = financialData.reduce((acc, curr) => acc + curr.totalRevenue, 0);
        const totalGroupHeadcount = Object.values(companyEmployeeStats).reduce((acc: number, curr: any) => acc + curr.total, 0);
        const totalMonthlyBurn = Object.values(salaryByManager).reduce((acc, curr) => acc + curr, 0);
        const estimatedNetProfit = totalGroupRevenue - (totalMonthlyBurn * 12);

        // Calculate overall growth
        const totalLastMonth = financialData.reduce((acc, c) => acc + c.lastMonthRevenue, 0);
        const overallGrowth = totalLastMonth > 0 ? ((totalGroupRevenue - totalLastMonth) / totalLastMonth * 100).toFixed(1) : '0';

        // 6. Pending Approvals for MD
        const pendingIncrements = await prisma.salaryIncrementRecord.count({
            where: { status: { not: 'APPROVED' }, isDraft: false }
        });

        const pendingLeaveApplications = await prisma.leaveRequest.count({
            where: { status: 'PENDING' }
        });

        const pendingInvoices = await prisma.invoice.count({
            where: { status: 'UNPAID' }
        });

        // 7. Alerts & Insights
        const alerts = [];

        // Low revenue companies
        const lowRevenueCompanies = financialData.filter(c => c.totalRevenue < 100000);
        if (lowRevenueCompanies.length > 0) {
            alerts.push({
                type: 'warning',
                title: 'Low Revenue Alert',
                message: `${lowRevenueCompanies.length} company(ies) generating less than ₹1L revenue`,
                companies: lowRevenueCompanies.map(c => c.companyName)
            });
        }

        // High burn rate companies
        const highBurnCompanies = companies.map(c => {
            const empStats = companyEmployeeStats[c.id];
            const avgSalary = empStats?.avgSalary || 0;
            return { name: c.name, avgSalary };
        }).filter(c => c.avgSalary > 100000);

        if (highBurnCompanies.length > 0) {
            alerts.push({
                type: 'info',
                title: 'High Salary Benchmarks',
                message: `${highBurnCompanies.length} company(ies) have avg monthly salary > ₹1L`,
                companies: highBurnCompanies.map(c => c.name)
            });
        }

        // 8. Quick Stats
        const avgRevenuePerCompany = financialData.length > 0 ? totalGroupRevenue / financialData.length : 0;
        const avgHeadcountPerCompany = companies.length > 0 ? totalGroupHeadcount / companies.length : 0;

        // Employee type breakdown
        const employeeTypeBreakdown: Record<string, number> = {};
        Object.values(companyEmployeeStats).forEach((stats: any) => {
            Object.entries(stats.types).forEach(([type, count]) => {
                employeeTypeBreakdown[type] = (employeeTypeBreakdown[type] || 0) + (count as number);
            });
        });

        // 9. Department-wise performance
        const departmentPerformance = Object.entries(salaryByDept)
            .map(([name, total]) => ({ name, totalSalary: total, employeeCount: 0 }))
            .sort((a, b) => b.totalSalary - a.totalSalary);

        // 10. Monthly burn trend (last 6 months)
        const burnTrend: Record<string, number> = {};
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const monthKey = new Date(now.getFullYear(), now.getMonth() - i, 1).toISOString().slice(0, 7);
            burnTrend[monthKey] = totalMonthlyBurn; // Simplified - same burn each month
        }

        return NextResponse.json({
            executive: {
                totalRevenue: totalGroupRevenue,
                totalHeadcount: totalGroupHeadcount,
                monthlyBurnRate: totalMonthlyBurn,
                netProfitEstimate: estimatedNetProfit,
                activeCompanies: companies.length,
                overallGrowth: parseFloat(overallGrowth as string),
                avgRevenuePerCompany,
                avgHeadcountPerCompany,
                employeeTypeBreakdown
            },
            financials: financialData,
            demographics: employeeTypeBreakdown,
            companyStats: companies.map(c => {
                const stats = companyEmployeeStats[c.id] || { total: 0, types: {}, avgSalary: 0, totalSalary: 0 };
                return {
                    companyId: c.id,
                    companyName: c.name,
                    total: stats.total,
                    breakdown: stats.types,
                    avgSalary: stats.avgSalary,
                    totalSalary: stats.totalSalary,
                    monthlyHeadcount: monthlyHeadcountTrend[c.name] || {}
                };
            }),
            salary: {
                byManager: managerSalaryAnalysis,
                byDepartment: departmentPerformance,
                totalMonthly: totalMonthlyBurn,
                breakdown: globalBreakdown,
                burnTrend
            },
            trends: {
                revenue: monthlyRevenueTrend,
                headcount: monthlyHeadcountTrend
            },
            approvals: {
                pendingIncrements,
                pendingLeaveApplications,
                pendingInvoices,
                total: pendingIncrements + pendingLeaveApplications + pendingInvoices
            },
            alerts
        });

    } catch (error: any) {
        console.error('Super Admin Analytics Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
