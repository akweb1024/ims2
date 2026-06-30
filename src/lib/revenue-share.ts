import { prisma } from './prisma';
import { logger } from './logger';
import { buildShareRows, istPeriod } from './revenue-share-core';

export { buildShareRows, istPeriod, roundMoney } from './revenue-share-core';
export type { MatchedRule, BuildShareRowsInput } from './revenue-share-core';

/**
 * Cross-company department revenue-sharing engine.
 *
 * When a RevenueTransaction is verified, support/production departments earn a fixed
 * share of it per the active RevenueShareRule rows, and the source revenue department
 * keeps the remainder (recorded as an explicit "residual" row for clean internal P&L).
 * The pure allocation math lives in ./revenue-share-core (buildShareRows).
 *
 * Mirrors `processExpenseAllocations` in ./allocation.ts: it is caller-driven (invoke it
 * only on a genuine VERIFIED transition — it does NOT re-read verificationStatus, because
 * callers frequently trigger it before the status write is persisted), idempotent, and
 * never throws into the caller's critical path (callers wrap it in try/catch).
 */
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

        // Denormalize each beneficiary's company for cross-company P&L grouping.
        const beneficiaryIds = [...new Set(rules.map((r) => r.beneficiaryDepartmentId))];
        const beneficiaries = beneficiaryIds.length
            ? await prisma.department.findMany({ where: { id: { in: beneficiaryIds } }, select: { id: true, companyId: true } })
            : [];
        const beneficiaryCompanyById = Object.fromEntries(beneficiaries.map((b) => [b.id, b.companyId]));

        const rows = buildShareRows({
            revenueTransactionId,
            amount,
            sourceCompanyId: tx.companyId,
            sourceDepartmentId: tx.departmentId,
            period: istPeriod(tx.paymentDate),
            rules,
            beneficiaryCompanyById,
        });

        if (rows === null) {
            logger.warn('RevenueShare: matched rules exceed 100%, skipping to avoid over-allocation', {
                revenueTransactionId,
                totalSharedPct: rules.reduce((s, r) => s + r.percentage, 0),
                ruleCount: rules.length,
            });
            return [];
        }

        if (rows.length === 0) {
            logger.info('RevenueShare: no rules matched and no residual to record', { revenueTransactionId });
            return [];
        }

        await prisma.departmentRevenueShare.createMany({ data: rows });
        logger.info(`RevenueShare: recorded ${rows.length} share row(s)`, {
            revenueTransactionId,
            shareCount: rows.filter((r) => !r.isResidual).length,
            hasResidual: rows.some((r) => r.isResidual),
        });
        return rows;
    } catch (error) {
        logger.error('RevenueShare error', error, { revenueTransactionId });
        throw error;
    }
}
