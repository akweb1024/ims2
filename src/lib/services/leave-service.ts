import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { calculateLeaveBalance } from '@/lib/utils/leave-calculator';

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
        // Calculate days duration
        const start = new Date(existing.startDate);
        const end = new Date(existing.endDate);

        // Reset time component to ensure daily difference
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const month = start.getMonth() + 1;
        const year = start.getFullYear();

        // Get latest ledger state
        const currentLedger = await tx.leaveLedger.findUnique({
            where: {
                employeeId_month_year: {
                    employeeId: existing.employeeId,
                    month,
                    year
                }
            }
        });

        // Determine balance adjustment
        let takenAdjustment = 0;
        if (isNowApproved && !wasApproved) {
            takenAdjustment = diffDays;
        } else if (!isNowApproved && wasApproved) {
            takenAdjustment = -diffDays;
        }

        if (takenAdjustment !== 0) {
            const opening = currentLedger?.openingBalance || existing.employee.currentLeaveBalance || 0;
            const autoCredit = currentLedger?.autoCredit || 0;
            const oldTaken = currentLedger?.takenLeaves || 0;
            const newTaken = Math.max(0, oldTaken + takenAdjustment);
            const lateDeds = (currentLedger?.lateDeductions || 0) + (currentLedger?.shortLeaveDeductions || 0);

            // Use shared calculator for consistency
            const { displayBalance } = calculateLeaveBalance(opening, autoCredit, newTaken, lateDeds, 0);

            // Sync Ledger
            await tx.leaveLedger.upsert({
                where: {
                    employeeId_month_year: {
                        employeeId: existing.employeeId,
                        month,
                        year
                    }
                },
                update: {
                    takenLeaves: newTaken,
                    closingBalance: displayBalance
                },
                create: {
                    employeeId: existing.employeeId,
                    month,
                    year,
                    openingBalance: opening,
                    autoCredit,
                    takenLeaves: newTaken,
                    closingBalance: displayBalance,
                    companyId: existing.companyId || undefined
                }
            });

            // Sync Profile
            await tx.employeeProfile.update({
                where: { id: existing.employeeId },
                data: {
                    currentLeaveBalance: displayBalance,
                    leaveBalance: displayBalance // Sync both fields used in different parts of app
                }
            });
        }
    }

    return updatedLeave;
}
