import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { generateSalarySlips } from '@/lib/services/payroll/generateSalarySlips';

export const GET = authorizedRoute(
    [],
    async (req: NextRequest, user) => {
        try {


            const { searchParams } = new URL(req.url);
            const employeeId = searchParams.get('employeeId');
            const showAll = searchParams.get('all') === 'true';
            const month = searchParams.get('month');
            const year = searchParams.get('year');

            const where: any = {};

            if (month) where.month = parseInt(month);
            if (year) where.year = parseInt(year);

            if (employeeId) {
                // Check authorization for specific employee view
                if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                    return createErrorResponse('Forbidden', 403);
                }

                if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                    const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                    const allowedIds = [...subIds, user.id];
                    const targetEmp = await prisma.employeeProfile.findUnique({ where: { id: employeeId }, select: { userId: true } });

                    if (!targetEmp || !allowedIds.includes(targetEmp.userId)) {
                        return createErrorResponse('Forbidden: Not in your team', 403);
                    }
                }

                where.employeeId = employeeId;
                if (user.companyId) {
                    where.employee = { user: { companyId: user.companyId } };
                }
            } else if (showAll && ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'TEAM_LEADER'].includes(user.role)) {

                if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                    const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                    const allowedIds = [...subIds, user.id]; // Include self
                    where.employee = { userId: { in: allowedIds } };
                } else {
                    // Admin/Super Admin
                    if (user.companyId) {
                        where.employee = { user: { companyId: user.companyId } };
                    }
                }
            } else {
                const profile = await prisma.employeeProfile.findUnique({
                    where: { userId: user.id }
                });
                if (!profile) return NextResponse.json([]);
                where.employeeId = profile.id;
            }

            const slips = await prisma.salarySlip.findMany({
                where,
                include: {
                    employee: {
                        include: { user: { select: { email: true } } }
                    }
                },
                orderBy: [{ year: 'desc' }, { month: 'desc' }]
            });

            return NextResponse.json(slips);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();

            // Unified Generation Logic (Bulk or Single)
            if (body.action === 'GENERATE' || body.action === 'BULK_GENERATE') {
                const { month, year, employeeId } = body;
                const m = parseInt(month);
                const y = parseInt(year);

                const where: any = {
                    user: {
                        isActive: true,
                        companyId: user.companyId
                    }
                };

                // Filter by specific employee if requested
                if (employeeId) {
                    where.id = employeeId;
                }

                if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                    const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                    // If creating for specific employee, ensure they are in downline
                    if (employeeId) {
                        const targetStats = await prisma.employeeProfile.findUnique({
                            where: { id: employeeId },
                            select: { userId: true }
                        });
                        if (!targetStats || !subIds.includes(targetStats.userId)) {
                            return createErrorResponse('Forbidden: Not in your team', 403);
                        }
                        where.id = employeeId;
                    } else {
                        where.userId = { in: subIds };
                    }
                }

                const employees = await prisma.employeeProfile.findMany({
                    where,
                    include: {
                        salaryStructure: true
                    }
                });

                if (employees.length === 0) {
                    return NextResponse.json({ message: 'No eligible employees found for payroll generation.', count: 0 });
                }
                const { generatedCount } = await prisma.$transaction((tx) =>
                    generateSalarySlips(
                        {
                            companyId: user.companyId!,
                            month: m,
                            year: y,
                            employees: employees.map((e: any) => ({
                                id: e.id,
                                currentLeaveBalance: e.currentLeaveBalance,
                                salaryStructure: e.salaryStructure,
                            })),
                        },
                        tx
                    )
                );

                return NextResponse.json({ message: `Payroll generation complete for ${generatedCount} employee(s).`, count: generatedCount });
            }

            // Single Creation
            const { employeeId, month, year, amountPaid, status } = body;

            const slip = await prisma.salarySlip.create({
                data: {
                    employeeId,
                    month: parseInt(month),
                    year: parseInt(year),
                    amountPaid: parseFloat(amountPaid),
                    status: status || 'GENERATED'
                }
            });

            return NextResponse.json(slip);
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
