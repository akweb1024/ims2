import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getCurrentMonthYear, calculateLeaveBalance } from '@/lib/utils/leave-calculator';

const MONTHLY_LEAVE_CREDIT = 1.5;

/**
 * POST: Credit monthly leaves to all active employees
 * This endpoint should be called on the 1st of every month (via cron job)
 * Can also be triggered manually by authorized users
 */
export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const { month, year } = getCurrentMonthYear();
            const body = await req.json();

            // Allow manual override of month/year for testing or corrections
            const targetMonth = body.month || month;
            const targetYear = body.year || year;

            // Get all active employees
            const employees = await prisma.employeeProfile.findMany({
                where: {
                    user: {
                        isActive: true
                    }
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            companyId: true,
                            isActive: true
                        }
                    }
                }
            });

            const results: any[] = [];
            const errors: any[] = [];

            for (const employee of employees) {
                try {
                    await prisma.$transaction(async (tx) => {
                        // Get previous month's ledger to calculate opening balance
                        const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
                        const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;

                        const previousLedger = await tx.leaveLedger.findUnique({
                            where: {
                                employeeId_month_year: {
                                    employeeId: employee.id,
                                    month: prevMonth,
                                    year: prevYear
                                }
                            }
                        });

                        const openingBalance = previousLedger?.closingBalance || employee.currentLeaveBalance || 0;

                        // Check if ledger already exists for this month
                        const existingLedger = await tx.leaveLedger.findUnique({
                            where: {
                                employeeId_month_year: {
                                    employeeId: employee.id,
                                    month: targetMonth,
                                    year: targetYear
                                }
                            }
                        });

                        if (existingLedger) {
                            if (!existingLedger.autoCredit) {
                                const { displayBalance } = calculateLeaveBalance(
                                    existingLedger.openingBalance,
                                    MONTHLY_LEAVE_CREDIT,
                                    existingLedger.takenLeaves,
                                    existingLedger.lateDeductions,
                                    existingLedger.shortLeaveDeductions
                                );

                                const updated = await tx.leaveLedger.update({
                                    where: { id: existingLedger.id },
                                    data: {
                                        autoCredit: MONTHLY_LEAVE_CREDIT,
                                        closingBalance: displayBalance
                                    }
                                });

                                await tx.employeeProfile.update({
                                    where: { id: employee.id },
                                    data: {
                                        currentLeaveBalance: updated.closingBalance,
                                        leaveBalance: updated.closingBalance
                                    }
                                });

                                results.push({ employeeId: employee.id, status: 'updated', credited: MONTHLY_LEAVE_CREDIT, newBalance: updated.closingBalance });
                            } else {
                                results.push({ employeeId: employee.id, status: 'skipped', reason: 'Already credited' });
                            }
                        } else {
                            const { displayBalance } = calculateLeaveBalance(openingBalance, MONTHLY_LEAVE_CREDIT, 0, 0, 0);

                            const newLedger = await tx.leaveLedger.create({
                                data: {
                                    employeeId: employee.id,
                                    month: targetMonth,
                                    year: targetYear,
                                    openingBalance,
                                    autoCredit: MONTHLY_LEAVE_CREDIT,
                                    takenLeaves: 0,
                                    closingBalance: displayBalance,
                                    companyId: employee.user.companyId,
                                    remarks: `Auto-credited ${MONTHLY_LEAVE_CREDIT} leaves`
                                }
                            });

                            await tx.employeeProfile.update({
                                where: { id: employee.id },
                                data: {
                                    currentLeaveBalance: newLedger.closingBalance,
                                    leaveBalance: newLedger.closingBalance
                                }
                            });

                            results.push({ employeeId: employee.id, status: 'created', credited: MONTHLY_LEAVE_CREDIT, newBalance: newLedger.closingBalance });
                        }
                    });
                } catch (error: any) {
                    errors.push({ employeeId: employee.id, error: error.message });
                }
            }

            return NextResponse.json({
                success: true,
                month: targetMonth,
                year: targetYear,
                totalEmployees: employees.length,
                processed: results.length,
                errorCount: errors.length,
                results,
                errors
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);

/**
 * GET: Check auto-credit status for current month
 */
export const GET = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN', 'HR'],
    async (req: NextRequest, user) => {
        try {
            const { month, year } = getCurrentMonthYear();

            const ledgersWithCredit = await prisma.leaveLedger.count({
                where: {
                    month,
                    year,
                    autoCredit: { not: null }
                }
            });

            const totalEmployees = await prisma.employeeProfile.count({
                where: {
                    user: {
                        isActive: true
                    }
                }
            });

            return NextResponse.json({
                month,
                year,
                totalEmployees,
                creditedEmployees: ledgersWithCredit,
                isCredited: ledgersWithCredit > 0,
                pendingEmployees: totalEmployees - ledgersWithCredit
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
