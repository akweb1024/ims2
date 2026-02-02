import { prisma } from './prisma';
import { logger } from './logger';
import { ExpenseAllocationRule } from '@prisma/client';

/**
 * Calculates and records departmental expense allocations for a revenue transaction.
 * @param revenueTransactionId The ID of the approved revenue transaction.
 * @returns An array of created allocation records.
 */
export async function processExpenseAllocations(revenueTransactionId: string) {
    try {
        // 1. Fetch the transaction details
        const transaction = await prisma.revenueTransaction.findUnique({
            where: { id: revenueTransactionId },
            include: {
                claimedBy: true,
                company: true
            }
        });

        if (!transaction || !transaction.claimedByEmployeeId) {
            logger.warn('Allocation: Transaction not found or not claimed by an employee.', { revenueTransactionId });
            return [];
        }

        const { amount, companyId, claimedByEmployeeId } = transaction;

        // 1b. Check if allocations already exist to prevent duplicates
        const existingAllocations = await prisma.employeeExpenseAllocation.findFirst({
            where: { revenueTransactionId }
        });

        if (existingAllocations) {
            logger.info('Allocation: Allocations already exist for this transaction. Skipping.', { revenueTransactionId });
            return [];
        }

        // 2. Fetch active allocation rules for the company
        const rules = await prisma.expenseAllocationRule.findMany({
            where: {
                companyId,
                isActive: true
            }
        });

        if (rules.length === 0) {
            logger.info('Allocation: No active rules found for company.', { companyId });
            return [];
        }

        // 3. Calculate and create allocations
        const allocations = await Promise.all(rules.map(async (rule: ExpenseAllocationRule) => {
            const allocationAmount = (amount * rule.percentage) / 100;

            return await prisma.employeeExpenseAllocation.create({
                data: {
                    companyId,
                    employeeProfileId: claimedByEmployeeId,
                    departmentId: rule.departmentId,
                    revenueTransactionId,
                    amount: allocationAmount,
                    percentage: rule.percentage,
                    date: transaction.paymentDate
                }
            });
        }));

        logger.info(`Allocation: Successfully processed ${allocations.length} allocations for transaction ${revenueTransactionId}`);

        // 4. Optional: Sync with FinancialRecord (Expense Ledger)
        // This is a design decision - do we want these to be individual expense records?
        // Let's create one summary expense record for the company ledger if needed.

        return allocations;

    } catch (error) {
        logger.error('Allocation Error:', error);
        throw error;
    }
}
