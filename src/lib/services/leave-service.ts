import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { calculateLeaveBalance } from '@/lib/utils/leave-calculator';

function getMonthKey(date: Date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}`;
}

function getLeaveDaysByMonth(startDate: Date, endDate: Date) {
    const cursor = new Date(startDate);
    cursor.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);

    const monthlyDays = new Map<string, { month: number; year: number; days: number }>();

    while (cursor <= end) {
        const key = getMonthKey(cursor);
        const existing = monthlyDays.get(key);

        if (existing) {
            existing.days += 1;
        } else {
            monthlyDays.set(key, {
                month: cursor.getMonth() + 1,
                year: cursor.getFullYear(),
                days: 1
            });
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    return Array.from(monthlyDays.values()).sort((a, b) =>
        a.year === b.year ? a.month - b.month : a.year - b.year
    );
}

/**
 * Centalized service for handling leave request status changes
 * and associated side effects (balance deduction, ledger updates)
 */
export async function updateLeaveRequestStatus(
    leaveId: string,
    status: string,
    adminId: string,
    tx: Prisma.TransactionClient = prisma
) {
    // 1. Fetch current leave request with employee profile
    const existing = await tx.leaveRequest.findUnique({
        where: { id: leaveId },
        include: { employee: true }
    });

    if (!existing) {
        throw new Error('Leave request not found');
    }

    // 2. Perform transitions only if status actually changed
    if (existing.status === status) {
        return existing;
    }

    // 3. Update the leave request status
    const updatedLeave = await tx.leaveRequest.update({
        where: { id: leaveId },
        data: {
            status: status as any,
            approvedById: adminId
        }
    });

    // 4. Handle side effects (Balance Deduction/Refund)
    // Logic: 
    // - If transitioning TO 'APPROVED', deduct balance.
    // - If transitioning FROM 'APPROVED' to something else (REJECTED/PENDING), refund balance.

    const isNowApproved = status === 'APPROVED';
    const wasApproved = existing.status === 'APPROVED';

    if (isNowApproved || wasApproved) {
        const start = new Date(existing.startDate);
        const end = new Date(existing.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        const monthlyAllocations = getLeaveDaysByMonth(start, end);
        let takenAdjustment = 0;
        if (isNowApproved && !wasApproved) {
            takenAdjustment = 1;
        } else if (!isNowApproved && wasApproved) {
            takenAdjustment = -1;
        }

        if (takenAdjustment !== 0) {
            let latestDisplayBalance = existing.employee.currentLeaveBalance || 0;

            for (const allocation of monthlyAllocations) {
                const currentLedger = await tx.leaveLedger.findUnique({
                    where: {
                        employeeId_month_year: {
                            employeeId: existing.employeeId,
                            month: allocation.month,
                            year: allocation.year
                        }
                    }
                });

                const previousMonth = allocation.month === 1
                    ? { month: 12, year: allocation.year - 1 }
                    : { month: allocation.month - 1, year: allocation.year };

                const previousLedger = await tx.leaveLedger.findUnique({
                    where: {
                        employeeId_month_year: {
                            employeeId: existing.employeeId,
                            month: previousMonth.month,
                            year: previousMonth.year
                        }
                    }
                });

                const opening = currentLedger?.openingBalance
                    ?? previousLedger?.closingBalance
                    ?? existing.employee.currentLeaveBalance
                    ?? 0;
                const autoCredit = currentLedger?.autoCredit || 0;
                const oldTaken = currentLedger?.takenLeaves || 0;
                const newTaken = Math.max(0, oldTaken + (allocation.days * takenAdjustment));
                const lateDeds = currentLedger?.lateDeductions || 0;
                const shortDeds = currentLedger?.shortLeaveDeductions || 0;

                const { displayBalance } = calculateLeaveBalance(opening, autoCredit, newTaken, lateDeds, shortDeds);

                await tx.leaveLedger.upsert({
                    where: {
                        employeeId_month_year: {
                            employeeId: existing.employeeId,
                            month: allocation.month,
                            year: allocation.year
                        }
                    },
                    update: {
                        takenLeaves: newTaken,
                        closingBalance: displayBalance
                    },
                    create: {
                        employeeId: existing.employeeId,
                        month: allocation.month,
                        year: allocation.year,
                        openingBalance: opening,
                        autoCredit,
                        takenLeaves: newTaken,
                        closingBalance: displayBalance,
                        companyId: existing.companyId || undefined
                    }
                });

                latestDisplayBalance = displayBalance;
            }

            // Sync Profile
            const profile = existing.employee;
            const metrics = profile.metrics as any || {};
            if (!metrics.leaveBalances) {
                metrics.leaveBalances = {
                    sick: { total: 10, used: 0 },
                    casual: { total: 7, used: 0 },
                    annual: { total: 20, used: 0 },
                    compensatory: { total: 5, used: 0 }
                };
            }

            // Map type to bucket
            const typeMapping: Record<string, string> = {
                'SICK': 'sick',
                'CASUAL': 'casual',
                'EARNED': 'annual', // Map EARNED to annual bucket
                'ANNUAL': 'annual',
                'COMPENSATORY': 'compensatory'
            };

            const bucket = typeMapping[existing.type] || 'annual';
            if (metrics.leaveBalances[bucket]) {
                const totalDays = monthlyAllocations.reduce((sum, item) => sum + item.days, 0);
                metrics.leaveBalances[bucket].used = Math.max(0, (metrics.leaveBalances[bucket].used || 0) + (totalDays * takenAdjustment));
            }

            await tx.employeeProfile.update({
                where: { id: existing.employeeId },
                data: {
                    currentLeaveBalance: latestDisplayBalance,
                    leaveBalance: latestDisplayBalance,
                    metrics: metrics // Sync the JSON breakdown
                }
            });
        }
    }

    return updatedLeave;
}
