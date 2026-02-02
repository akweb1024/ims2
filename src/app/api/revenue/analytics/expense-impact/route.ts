import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';

export const GET = authorizedRoute(['ADMIN', 'SUPER_ADMIN', 'FINANCE_ADMIN', 'MANAGER'], async (req: NextRequest, user) => {
    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const employeeId = searchParams.get('employeeId');

        const where: any = {
            companyId: user.companyId as string
        };

        if (employeeId) where.employeeProfileId = employeeId;
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(startDate);
            if (endDate) where.date.lte = new Date(endDate);
        }

        const allocations = await prisma.employeeExpenseAllocation.findMany({
            where,
            include: {
                department: { select: { name: true } }
            }
        });

        // Aggregate by department
        const departmentImpact: Record<string, { name: string, amount: number }> = {};
        let totalImpact = 0;

        allocations.forEach((alloc: any) => {
            const deptId = alloc.departmentId;
            if (!departmentImpact[deptId]) {
                departmentImpact[deptId] = { name: alloc.department.name, amount: 0 };
            }
            departmentImpact[deptId].amount += alloc.amount;
            totalImpact += alloc.amount;
        });

        const chartData = Object.values(departmentImpact).map(d => ({
            name: d.name,
            value: Number(d.amount.toFixed(2))
        }));

        return NextResponse.json({
            chartData,
            totalImpact: Number(totalImpact.toFixed(2)),
            count: allocations.length
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
});
