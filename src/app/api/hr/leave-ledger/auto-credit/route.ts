import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getCurrentMonthYear } from '@/lib/utils/leave-calculator';

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

            const results = [];
            const errors = [];

            for (const employee of employees) {
                try {
                    // Get previous month's ledger to calculate opening balance
                    const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
                    const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;

                    const previousLedger = await prisma.leaveLedger.findUnique({
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
                    const existingLedger = await prisma.leaveLedger.findUnique({
                        where: {
                            employeeId_month_year: {
                                employeeId: employee.id,
                                month: targetMonth,
                                year: targetYear
                            }
                        }
                    });

                    if (existingLedger) {
                        // Update existing ledger with auto-credit if not already credited
                        if (!existingLedger.autoCredit) {
                            const updated = await prisma.leaveLedger.update({
                                where: { id: existingLedger.id },
                                data: {
                                    autoCredit: MONTHLY_LEAVE_CREDIT,
                                    closingBalance: existingLedger.closingBalance + MONTHLY_LEAVE_CREDIT
                                }
                            });

                            // Update employee's current leave balance
                            await prisma.employeeProfile.update({
                                where: { id: employee.id },
                                data: {
                                    currentLeaveBalance: updated.closingBalance
                                }
                            });

                            results.push({
                                employeeId: employee.id,
                                status: 'updated',
                                credited: MONTHLY_LEAVE_CREDIT,
                                newBalance: updated.closingBalance
                            });
                        } else {
                            results.push({
                                employeeId: employee.id,
                                status: 'skipped',
                                reason: 'Already credited for this month'
                            });
                        }
                    } else {
                        // Create new ledger entry with auto-credit
                        const newLedger = await prisma.leaveLedger.create({
                            data: {
                                employeeId: employee.id,
                                month: targetMonth,
                                year: targetYear,
                                openingBalance,
                                autoCredit: MONTHLY_LEAVE_CREDIT,
                                takenLeaves: 0,
                                lateArrivalCount: 0,
                                shortLeaveCount: 0,
                                lateDeductions: 0,
                                shortLeaveDeductions: 0,
                                closingBalance: openingBalance + MONTHLY_LEAVE_CREDIT,
                                companyId: employee.user.companyId,
                                remarks: `Auto-credited ${MONTHLY_LEAVE_CREDIT} leaves`
                            }
                        });

                        // Update employee's current leave balance
                        await prisma.employeeProfile.update({
                            where: { id: employee.id },
                            data: {
                                currentLeaveBalance: newLedger.closingBalance
                            }
                        });

                        results.push({
                            employeeId: employee.id,
                            status: 'created',
                            credited: MONTHLY_LEAVE_CREDIT,
                            newBalance: newLedger.closingBalance
                        });
                    }
                } catch (error: any) {
                    errors.push({
                        employeeId: employee.id,
                        error: error.message
                    });
                }
            }

            return NextResponse.json({
                success: true,
                month: targetMonth,
                year: targetYear,
                totalEmployees: employees.length,
                processed: results.length,
                errors: errors.length,
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
