
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

        // 2. Fetch All Companies
        const companies = await prisma.company.findMany({
            select: { id: true, name: true, logoUrl: true }
        });

        // 3. Financial Overview (Aggregated from Paid Invoices)
        // Note: Using Invoice table as a proxy for Revenue
        const revenueByCompany = await prisma.invoice.groupBy({
            by: ['companyId'],
            where: {
                status: 'PAID'
            },
            _sum: {
                total: true
            }
        });

        const financialData = companies.map(comp => {
            const rev = revenueByCompany.find(r => r.companyId === comp.id);
            return {
                companyId: comp.id,
                companyName: comp.name,
                totalRevenue: rev?._sum.total || 0,
                // Mock target for "In/Out" status, or assume 0 is "Out"
                status: (rev?._sum.total || 0) > 0 ? 'In Revenue' : 'Pre-Revenue'
            };
        });

        // 4. Employee Demographics
        const employeeStats = await prisma.employeeProfile.groupBy({
            by: ['userId', 'employeeType'], // grouped by userId effectively counts distinct profiles if 1:1, but employeeType is on profile.
            // Wait, groupBy on relations is not direct.
            // We need to group by company, but company is on User, not direct on Profile usually, 
            // BUT, verify schema: `user User @relation...`. User has `companyId`.
            // Prisma groupBy doesn't support deep relation grouping easily.
            // Better to fetch all profiles with select { employeeType, user: { companyId } } and aggregate in JS for flexibility
            // OR use raw query. JS aggregation is safer for portable logic with moderate data size.
        });

        // Optimized Approach: Fetch lightweight data
        const allProfiles = await prisma.employeeProfile.findMany({
            select: {
                employeeType: true,
                salaryStructure: {
                    select: {
                        ctc: true
                    }
                },
                user: {
                    select: {
                        companyId: true,
                        managerId: true,
                        departmentId: true,
                        name: true, // For manager name resolution
                        department: { select: { name: true } }
                    }
                }
            },
            where: {
                user: {
                    isActive: true
                }
            }
        });

        // Aggregate Employees
        const companyEmployeeStats: Record<string, any> = {};

        // Aggregate Salaries
        const salaryByDept: Record<string, number> = {};
        const salaryByManager: Record<string, number> = {};

        // Helper to resolve manager names
        const managerNames: Record<string, string> = {};

        allProfiles.forEach(p => {
            const compId = p.user.companyId;
            if (!compId) return;

            // Init Company Stats
            if (!companyEmployeeStats[compId]) {
                companyEmployeeStats[compId] = {
                    companyId: compId,
                    total: 0,
                    types: {}
                };
            }

            // Count Types
            const type = p.employeeType || 'UNKNOWN';
            companyEmployeeStats[compId].types[type] = (companyEmployeeStats[compId].types[type] || 0) + 1;
            companyEmployeeStats[compId].total++;

            // Salary Analysis
            const ctc = p.salaryStructure?.ctc || 0;

            // By Dept
            const deptName = p.user.department?.name || 'Unassigned';
            salaryByDept[deptName] = (salaryByDept[deptName] || 0) + ctc;

            // By Manager
            if (p.user.managerId) {
                salaryByManager[p.user.managerId] = (salaryByManager[p.user.managerId] || 0) + ctc;
                // We don't have manager name directly attached to the profile's user.managerId
                // We need to look it up.
            }
        });

        // Resolve Manager Names (need a separate query or smarter look up)
        // Let's fetch all users who are managers
        const managerIds = Object.keys(salaryByManager);
        const managers = await prisma.user.findMany({
            where: { id: { in: managerIds } },
            select: { id: true, name: true }
        });
        managers.forEach(m => managerNames[m.id] = m.name || 'Unknown Manager');

        const managerSalaryAnalysis = managers.map(m => ({
            managerId: m.id,
            managerName: m.name,
            totalExpenditure: salaryByManager[m.id] || 0
        })).sort((a, b) => b.totalExpenditure - a.totalExpenditure).slice(0, 10); // Top 10

        // Format Employee Stats for Frontend
        const employeeDemographics = companies.map(c => {
            const stats = companyEmployeeStats[c.id] || { total: 0, types: {} };
            return {
                companyName: c.name,
                total: stats.total,
                breakdown: stats.types
            };
        });

        const departmentSalaryAnalysis = Object.entries(salaryByDept)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total);

        return NextResponse.json({
            financials: financialData,
            demographics: employeeDemographics,
            salary: {
                byManager: managerSalaryAnalysis,
                byDepartment: departmentSalaryAnalysis
            }
        });

    } catch (error: any) {
        console.error('Super Admin Analytics Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
