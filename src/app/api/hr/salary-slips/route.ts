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

                const statutoryConfig = await PayrollCalculator.getStatutoryConfig(user.companyId!);

                let generatedCount = 0;
                for (const emp of employees) {
                    try {
                        await prisma.$transaction(async (tx) => {
                            // Check if already exists
                            const existing = await tx.salarySlip.findFirst({
                                where: { employeeId: emp.id, month: m, year: y }
                            });

                            // If generating single, we might want to overwrite or warn? 
                            // For now, let's skip if exists, similar to bulk.
                            if (existing) return;

                            const struct = emp.salaryStructure;
                            if (!struct || struct.grossSalary <= 0) return;

                            // 1. Check for Advances / EMIs
                            const activeEmi = await tx.advanceEMI.findFirst({
                                where: {
                                    advance: { employeeId: emp.id, status: 'APPROVED' },
                                    month: m,
                                    year: y,
                                    status: 'PENDING'
                                }
                            });

                            // 2. Compute Leaves / LWP from LeaveLedger
                            const ledger = await tx.leaveLedger.findUnique({
                                where: {
                                    employeeId_month_year: {
                                        employeeId: emp.id,
                                        month: m,
                                        year: y
                                    }
                                }
                            });

                            const opening = ledger?.openingBalance || emp.currentLeaveBalance || 0;
                            const allotted = ledger?.autoCredit || 0;
                            const taken = ledger?.takenLeaves || 0;
                            const delayDeds = (ledger?.lateDeductions || 0) + (ledger?.shortLeaveDeductions || 0);

                            const actualBalance = opening + allotted - taken - delayDeds;
                            const overheadDays = actualBalance < 0 ? Math.abs(actualBalance) : 0;

                            const displayBalance = Math.max(0, actualBalance);
                            await tx.employeeProfile.update({
                                where: { id: emp.id },
                                data: {
                                    currentLeaveBalance: displayBalance,
                                    leaveBalance: displayBalance
                                }
                            });
                            const daysInMonth = new Date(y, m, 0).getDate();

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
                                salaryFixed: struct.salaryFixed || 0,
                                salaryVariable: struct.salaryVariable || 0,
                                salaryIncentive: 0,
                                lwpDays: overheadDays,
                                daysInMonth
                            }, statutoryConfig);

                            // 2b. Fetch and sum APPROVED incentives for this month/year
                            const incentives = await tx.employeeIncentive.findMany({
                                where: {
                                    employeeProfileId: emp.id,
                                    status: 'APPROVED',
                                    date: {
                                        gte: new Date(y, m - 1, 1),
                                        lt: new Date(y, m, 1)
                                    },
                                    salarySlipId: null
                                }
                            });
                            const incentiveSum = incentives.reduce((sum, inc) => sum + inc.amount, 0);

                            // Re-adjust netPayable and CTC to include incentiveSum
                            const finalNetPayable = breakdown.netPayable + incentiveSum;
                            const finalCTC = breakdown.costToCompany + incentiveSum;

                            const advanceDeduction = activeEmi ? activeEmi.amount : 0;
                            const amountPaidData = Math.max(0, finalNetPayable - advanceDeduction);

                            const slip = await tx.salarySlip.create({
                                data: {
                                    employeeId: emp.id,
                                    month: m,
                                    year: y,
                                    amountPaid: parseFloat(amountPaidData.toFixed(2)),
                                    advanceDeduction,
                                    lwpDeduction: breakdown.deductions.lwpDeduction,
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
                                    ctc: finalCTC,
                                    arrears: breakdown.arrears || 0,
                                    expenses: 0,
                                    healthCare: breakdown.perks.healthCare,
                                    travelling: breakdown.perks.travelling,
                                    mobile: breakdown.perks.mobile,
                                    internet: breakdown.perks.internet,
                                    booksAndPeriodicals: breakdown.perks.booksAndPeriodicals,
                                    salaryFixed: breakdown.salaryFixed,
                                    salaryVariable: breakdown.salaryVariable,
                                    salaryIncentive: incentiveSum,
                                    netPayable: amountPaidData,
                                    status: 'GENERATED',
                                    companyId: user.companyId
                                } as any
                            });

                            // 2c. Link incentives to the slip
                            if (incentives.length > 0) {
                                await tx.employeeIncentive.updateMany({
                                    where: { id: { in: incentives.map(i => i.id) } },
                                    data: { salarySlipId: slip.id, status: 'PAID' }
                                });
                            }

                            if (activeEmi) {
                                await tx.advanceEMI.update({
                                    where: { id: activeEmi.id },
                                    data: {
                                        status: 'PAID',
                                        salarySlipId: slip.id,
                                        paidAt: new Date()
                                    }
                                });

                                const advance = await tx.salaryAdvance.findUnique({
                                    where: { id: activeEmi.advanceId },
                                    include: { emis: true }
                                });

                                if (advance) {
                                    const pendingEmis = advance.emis.filter(e => e.status === 'PENDING').length;
                                    await tx.salaryAdvance.update({
                                        where: { id: advance.id },
                                        data: {
                                            status: pendingEmis === 0 ? 'COMPLETED' : 'APPROVED',
                                            paidEmis: advance.totalEmis - pendingEmis
                                        }
                                    });
                                }
                            }
                            generatedCount++;
                        });
                    } catch (err) {
                        console.error(`Failed to generate slip for ${emp.id}:`, err);
                    }
                }

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
