import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { logger } from './logger';

/**
 * Cross-company department revenue-sharing engine.
 *
 * When a RevenueTransaction is verified, support/production departments earn a fixed
 * share of it per the active RevenueShareRule rows, and the source revenue department
 * keeps the remainder (recorded as an explicit "residual" row for clean internal P&L).
 *
 * Mirrors `processExpenseAllocations` in ./allocation.ts: it is caller-driven (invoke it
 * only on a genuine VERIFIED transition — it does NOT re-read verificationStatus, because
 * callers frequently trigger it before the status write is persisted), idempotent, and
 * never throws into the caller's critical path (callers wrap it in try/catch).
 *
 * Decisions baked in:
 *  - Overlapping whole-company and source-department rules STACK (percentages add up).
 *  - A residual row is always recorded for the source department's kept remainder
 *    (including 100% when no rules match), provided the transaction has a source department.
 *  - If matched rules sum to >100%, nothing is written (over-allocation guard).
 */

const roundMoney = (n: number) => Math.round(n * 100) / 100;

// IST = UTC+5:30. Snapshot the period in IST so it aligns with the dashboard's monthly
// boundaries (getISTDateRangeForPeriod) and with period-close locking downstream.
function istPeriod(date: Date): { month: number; year: number } {
    const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
    return { month: ist.getUTCMonth() + 1, year: ist.getUTCFullYear() };
}

export async function processRevenueShares(revenueTransactionId: string) {
    try {
        const tx = await prisma.revenueTransaction.findUnique({
            where: { id: revenueTransactionId },
            select: { id: true, amount: true, companyId: true, departmentId: true, paymentDate: true },
        });

        if (!tx) {
            logger.warn('RevenueShare: transaction not found', { revenueTransactionId });
            return [];
        }

        // Idempotency: never double-allocate a transaction.
        const existing = await prisma.departmentRevenueShare.findFirst({ where: { revenueTransactionId } });
        if (existing) {
            logger.info('RevenueShare: shares already exist, skipping', { revenueTransactionId });
            return [];
        }

        const amount = Number(tx.amount) || 0;
        if (amount <= 0) {
            logger.info('RevenueShare: non-positive amount, skipping', { revenueTransactionId, amount });
            return [];
        }

        // Active + effective rules for this source company, narrowed to whole-company rules
        // OR ones targeting this transaction's source department. A transaction with no
        // department can only match whole-company rules.
        const rules = await prisma.revenueShareRule.findMany({
            where: {
                sourceCompanyId: tx.companyId,
                isActive: true,
                effectiveFrom: { lte: tx.paymentDate },
                AND: [
                    { OR: [{ effectiveTo: null }, { effectiveTo: { gte: tx.paymentDate } }] },
                    tx.departmentId
                        ? { OR: [{ sourceDepartmentId: null }, { sourceDepartmentId: tx.departmentId }] }
                        : { sourceDepartmentId: null },
                ],
            },
        });

        const totalSharedPct = rules.reduce((sum, r) => sum + r.percentage, 0);
        if (totalSharedPct > 100) {
            logger.warn('RevenueShare: matched rules exceed 100%, skipping to avoid over-allocation', {
                revenueTransactionId,
                totalSharedPct,
                ruleCount: rules.length,
            });
            return [];
        }

        // Denormalize each beneficiary's company for cross-company P&L grouping.
        const beneficiaryIds = [...new Set(rules.map((r) => r.beneficiaryDepartmentId))];
        const beneficiaries = beneficiaryIds.length
            ? await prisma.department.findMany({ where: { id: { in: beneficiaryIds } }, select: { id: true, companyId: true } })
            : [];
        const beneficiaryCompany = Object.fromEntries(beneficiaries.map((b) => [b.id, b.companyId]));

        const { month, year } = istPeriod(tx.paymentDate);

        const rows: Prisma.DepartmentRevenueShareCreateManyInput[] = rules.map((rule) => ({
            revenueTransactionId,
            ruleId: rule.id,
            sourceCompanyId: tx.companyId,
            sourceDepartmentId: tx.departmentId,
            beneficiaryDepartmentId: rule.beneficiaryDepartmentId,
            beneficiaryCompanyId: beneficiaryCompany[rule.beneficiaryDepartmentId] ?? tx.companyId,
            amount: roundMoney((amount * rule.percentage) / 100),
            percentage: rule.percentage,
            isResidual: false,
            periodMonth: month,
            periodYear: year,
        }));

        // Residual — the source revenue department keeps the remainder. Only attributable
        // when the transaction has a source department (else the remainder is unassigned).
        const residualPct = roundMoney(100 - totalSharedPct);
        if (tx.departmentId && residualPct > 0) {
            rows.push({
                revenueTransactionId,
                ruleId: null,
                sourceCompanyId: tx.companyId,
                sourceDepartmentId: tx.departmentId,
                beneficiaryDepartmentId: tx.departmentId,
                beneficiaryCompanyId: tx.companyId,
                amount: roundMoney((amount * residualPct) / 100),
                percentage: residualPct,
                isResidual: true,
                periodMonth: month,
                periodYear: year,
            });
        }

        if (rows.length === 0) {
            logger.info('RevenueShare: no rules matched and no residual to record', { revenueTransactionId });
            return [];
        }

        await prisma.departmentRevenueShare.createMany({ data: rows });
        logger.info(`RevenueShare: recorded ${rows.length} share row(s)`, {
            revenueTransactionId,
            totalSharedPct,
            residualPct,
        });
        return rows;
    } catch (error) {
        logger.error('RevenueShare error', error, { revenueTransactionId });
        throw error;
    }
}
