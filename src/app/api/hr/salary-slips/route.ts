import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getDownlineUserIds } from '@/lib/hierarchy';
import { PayrollCalculator } from '@/lib/payroll';

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
    ['SUPER_ADMIN', 'ADMIN', 'FINANCE_ADMIN', 'MANAGER', 'MANAGER'],
    async (req: NextRequest, user) => {
        try {
            const body = await req.json();

            // Handle Bulk Generation
            if (body.action === 'BULK_GENERATE') {
                const { month, year } = body;
                const m = parseInt(month);
                const y = parseInt(year);

                const where: any = {
                    user: {
                        isActive: true,
                        companyId: user.companyId
                    }
                };

                if (['MANAGER', 'TEAM_LEADER'].includes(user.role)) {
                    const subIds = await getDownlineUserIds(user.id, user.companyId || undefined);
                    where.userId = { in: subIds };
                }

                const employees = await prisma.employeeProfile.findMany({
                    where,
                    include: {
                        salaryStructure: true
                    }
                });

                const statutoryConfig = await PayrollCalculator.getStatutoryConfig(user.companyId!);

                let generatedCount = 0;
                for (const emp of employees) {
                    const existing = await prisma.salarySlip.findFirst({
                        where: { employeeId: emp.id, month: m, year: y }
                    });
                    if (existing) continue;

                    const struct = emp.salaryStructure;
                    if (!struct || struct.grossSalary <= 0) continue;

                    // 1. Check for Advances / EMIs
                    const activeEmi = await prisma.advanceEMI.findFirst({
                        where: {
                            advance: { employeeId: emp.id, status: 'APPROVED' },
                            month: m,
                            year: y,
                            status: 'PENDING'
                        }
                    });

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

                    const availableBal = emp.leaveBalance;
                    const overheadDays = Math.max(0, leaveTakenThisMonth - availableBal);

                    // Update employee leave balance
                    const newBal = Math.max(0, availableBal - leaveTakenThisMonth);
                    await prisma.employeeProfile.update({
                        where: { id: emp.id },
                        data: { leaveBalance: newBal }
                    });

                    // 3. New Advanced Payroll Calculation
                    const breakdown = PayrollCalculator.calculate({
                        basicSalary: struct.basicSalary,
                        hra: struct.hra,
                        conveyance: struct.conveyance,
                        medical: struct.medical,
                        specialAllowance: struct.specialAllowance,
                        otherAllowances: struct.otherAllowances,
                        statutoryBonus: (struct as any).statutoryBonus || 0,
                        gratuity: (struct as any).gratuity || 0,
                        healthCare: (struct as any).healthCare || 0,
                        travelling: (struct as any).travelling || 0,
                        mobile: (struct as any).mobile || 0,
                        internet: (struct as any).internet || 0,
                        booksAndPeriodicals: (struct as any).booksAndPeriodicals || 0,
                        lwpDays: overheadDays,
                        daysInMonth
                    }, statutoryConfig);

                    const advanceDeduction = activeEmi ? activeEmi.amount : 0;
                    const finalPayable = Math.max(0, breakdown.netPayable - advanceDeduction);

                    const slip = await prisma.salarySlip.create({
                        data: {
                            employeeId: emp.id,
                            month: m,
                            year: y,
                            amountPaid: parseFloat(finalPayable.toFixed(2)),
                            advanceDeduction,
                            lwpDeduction: breakdown.deductions.lwpDeduction,

                            // Breakdown storage
                            basicSalary: breakdown.earnings.basic,
                            hra: breakdown.earnings.hra,
                            conveyance: breakdown.earnings.conveyance,
                            medical: breakdown.earnings.medical,
                            specialAllowance: breakdown.earnings.specialAllowance,
                            otherAllowances: breakdown.earnings.otherAllowances,
                            statutoryBonus: breakdown.earnings.statutoryBonus,
                            grossSalary: breakdown.earnings.gross,

                            pfEmployee: breakdown.deductions.pfEmployee,
                            esicEmployee: breakdown.deductions.esicEmployee,
                            professionalTax: breakdown.deductions.professionalTax,
                            tds: breakdown.deductions.tds,
                            totalDeductions: breakdown.deductions.total + advanceDeduction,

                            pfEmployer: breakdown.employerContribution.pfEmployer,
                            esicEmployer: breakdown.employerContribution.esicEmployer,
                            gratuity: breakdown.employerContribution.gratuity,
                            ctc: breakdown.costToCompany,
                            arrears: breakdown.arrears || 0,
                            expenses: 0,
                            healthCare: breakdown.perks.healthCare,
                            travelling: breakdown.perks.travelling,
                            mobile: breakdown.perks.mobile,
                            internet: breakdown.perks.internet,
                            booksAndPeriodicals: breakdown.perks.booksAndPeriodicals,
                            netPayable: breakdown.netPayable - advanceDeduction,

                            status: 'GENERATED',
                            companyId: user.companyId
                        } as any
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

                        const advance = await prisma.salaryAdvance.findUnique({
                            where: { id: activeEmi.advanceId },
                            include: { emis: true }
                        });

                        if (advance) {
                            const pendingEmis = advance.emis.filter(e => e.status === 'PENDING').length;
                            await prisma.salaryAdvance.update({
                                where: { id: advance.id },
                                data: {
                                    status: pendingEmis === 0 ? 'COMPLETED' : 'APPROVED',
                                    paidEmis: advance.totalEmis - pendingEmis
                                }
                            });
                        }
                    }

                    generatedCount++;
                }

                return NextResponse.json({ message: `Automated Statutory Payroll run complete for ${generatedCount} staff.`, count: generatedCount });
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
