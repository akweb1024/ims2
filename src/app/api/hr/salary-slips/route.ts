import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';

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
    ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'HR_MANAGER', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();

            // Handle Bulk Generation
            if (body.action === 'BULK_GENERATE') {
                const { month, year } = body;
                const m = parseInt(month);
                const y = parseInt(year);

                const employees = await prisma.employeeProfile.findMany({
                    where: {
                        user: { isActive: true, companyId: user.companyId }
                    },
                    include: {
                        salaryStructure: true
                    }
                });

                let generatedCount = 0;
                for (const emp of employees) {
                    const existing = await prisma.salarySlip.findFirst({
                        where: { employeeId: emp.id, month: m, year: y }
                    });
                    if (existing) continue;

                    let grossSalary = emp.baseSalary || 0;
                    if (emp.salaryStructure) grossSalary = emp.salaryStructure.grossSalary;

                    if (grossSalary <= 0) continue;

                    const totalDeductions = 0;
                    let advanceDeduction = 0;
                    let lwpDeduction = 0;

                    // 1. Check for Advances / EMIs
                    const activeEmi = await prisma.advanceEMI.findFirst({
                        where: {
                            advance: { employeeId: emp.id, status: 'APPROVED' },
                            month: m,
                            year: y,
                            status: 'PENDING'
                        }
                    });

                    if (activeEmi) {
                        advanceDeduction = activeEmi.amount;
                    }

                    // 2. Compute Leaves / LWP
                    const startDate = new Date(y, m - 1, 1);
                    const endDate = new Date(y, m, 0);
                    const daysInMonth = endDate.getDate();

                    const approvedLeaves = await prisma.leaveRequest.findMany({
                        where: {
                            employeeId: emp.id,
                            status: 'APPROVED',
                            startDate: { lte: endDate },
                            endDate: { gte: startDate }
                        }
                    });

                    let leaveTakenThisMonth = 0;
                    approvedLeaves.forEach(leave => {
                        const start = new Date(Math.max(leave.startDate.getTime(), startDate.getTime()));
                        const end = new Date(Math.min(leave.endDate.getTime(), endDate.getTime()));
                        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                        leaveTakenThisMonth += diff;
                    });

                    // Logic: Bal leave 0 default, so anything taken is usually deduction unless bal > 0
                    const availableBal = emp.leaveBalance;
                    let overheadDays = 0;

                    if (leaveTakenThisMonth > availableBal) {
                        overheadDays = leaveTakenThisMonth - availableBal;
                    }

                    if (overheadDays > 0) {
                        const dailyRate = grossSalary / daysInMonth;
                        lwpDeduction = dailyRate * overheadDays;
                    }

                    // Update employee leave balance for next month if any left, or set to 0
                    const newBal = Math.max(0, availableBal - leaveTakenThisMonth);
                    await prisma.employeeProfile.update({
                        where: { id: emp.id },
                        data: { leaveBalance: newBal }
                    });

                    const finalPayable = grossSalary - advanceDeduction - lwpDeduction;

                    const slip = await prisma.salarySlip.create({
                        data: {
                            employeeId: emp.id,
                            month: m,
                            year: y,
                            amountPaid: parseFloat(Math.max(0, finalPayable).toFixed(2)),
                            advanceDeduction,
                            lwpDeduction,
                            status: 'GENERATED',
                            companyId: user.companyId
                        }
                    });

                    // Mark EMI as paid if applicable
                    if (activeEmi) {
                        await prisma.advanceEMI.update({
                            where: { id: activeEmi.id },
                            data: {
                                status: 'PAID',
                                salarySlipId: slip.id,
                                paidAt: new Date()
                            }
                        });

                        // Check if advance is fully paid
                        const advance = await prisma.salaryAdvance.findUnique({
                            where: { id: activeEmi.advanceId },
                            include: { emis: true }
                        });

                        if (advance) {
                            const pendingEmis = advance.emis.filter(e => e.status === 'PENDING').length;
                            if (pendingEmis === 0) {
                                await prisma.salaryAdvance.update({
                                    where: { id: advance.id },
                                    data: { status: 'COMPLETED', paidEmis: advance.totalEmis }
                                });
                            } else {
                                await prisma.salaryAdvance.update({
                                    where: { id: advance.id },
                                    data: { paidEmis: advance.totalEmis - pendingEmis }
                                });
                            }
                        }
                    }

                    generatedCount++;
                }

                return NextResponse.json({ message: `Generated ${generatedCount} salary slips with automated deductions`, count: generatedCount });
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
