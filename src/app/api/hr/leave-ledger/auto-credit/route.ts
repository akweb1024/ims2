import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizedRoute } from '@/lib/middleware-auth';
import { createErrorResponse } from '@/lib/api-utils';
import { getCurrentMonthYear, calculateLeaveBalance } from '@/lib/utils/leave-calculator';

export const POST = authorizedRoute(
    ['SUPER_ADMIN', 'ADMIN'],
    async (req: NextRequest, user) => {
        try {
            const { month, year } = getCurrentMonthYear();

            // Fetch all active employees with their companyId from User
            const employees = await prisma.employeeProfile.findMany({
                where: { user: { isActive: true } },
                include: {
                    user: {
                        select: { companyId: true }
                    }
                }
            });

            let processedCount = 0;
            const LEAVE_CREDIT = 1.5;

            // Use a transaction for reliability if possible, or batch
            // For now, let's process them one by one or in a map
            for (const emp of employees) {
                // Get or create ledger for this month
                const ledger = await prisma.leaveLedger.upsert({
                    where: {
                        employeeId_month_year: {
                            employeeId: emp.id,
                            month,
                            year
                        }
                    },
                    update: {
                        autoCredit: LEAVE_CREDIT
                    },
                    create: {
                        employeeId: emp.id,
                        month,
                        year,
                        openingBalance: emp.currentLeaveBalance,
                        autoCredit: LEAVE_CREDIT,
                        takenLeaves: 0,
                        lateArrivalCount: 0,
                        shortLeaveCount: 0,
                        lateDeductions: 0,
                        shortLeaveDeductions: 0,
                        closingBalance: emp.currentLeaveBalance + LEAVE_CREDIT,
                        companyId: emp.user?.companyId
                    }
                });

                // Update employee profile current balance
                await prisma.employeeProfile.update({
                    where: { id: emp.id },
                    data: {
                        currentLeaveBalance: { increment: LEAVE_CREDIT }
                    }
                });

                processedCount++;
            }

            return NextResponse.json({
                message: `Successfully processed auto-credit for ${processedCount} employees.`,
                month,
                year,
                creditAmount: LEAVE_CREDIT
            });
        } catch (error) {
            return createErrorResponse(error);
        }
    }
);
