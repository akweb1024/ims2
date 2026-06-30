import type { Prisma } from '@prisma/client';

/**
 * Pure allocation math for department revenue-sharing — no I/O, no Prisma client,
 * so it is unit-testable in isolation (see tests/unit/revenue-share.test.ts).
 * The DB-bound engine in ./revenue-share.ts fetches inputs and calls into here.
 */

export const roundMoney = (n: number) => Math.round(n * 100) / 100;

// IST = UTC+5:30. Snapshot the period in IST so it aligns with the dashboard's monthly
// boundaries (getISTDateRangeForPeriod) and with period-close locking downstream.
export function istPeriod(date: Date): { month: number; year: number } {
    const ist = new Date(date.getTime() + 5.5 * 60 * 60 * 1000);
    return { month: ist.getUTCMonth() + 1, year: ist.getUTCFullYear() };
}

export interface MatchedRule {
    id: string;
    beneficiaryDepartmentId: string;
    percentage: number;
}

export interface BuildShareRowsInput {
    revenueTransactionId: string;
    amount: number;
    sourceCompanyId: string;
    sourceDepartmentId: string | null;
    period: { month: number; year: number };
    rules: MatchedRule[];
    /** beneficiaryDepartmentId -> its companyId (denormalized for cross-company P&L). */
    beneficiaryCompanyById: Record<string, string>;
}

/**
 * Returns the share rows to persist, or `null` when the matched rules over-allocate
 * (>100%) and the transaction must be skipped. Overlapping rules stack; a residual row
 * for the source department's kept remainder is appended when the transaction has a
 * source department and the remainder is positive.
 */
export function buildShareRows(
    input: BuildShareRowsInput,
): Prisma.DepartmentRevenueShareCreateManyInput[] | null {
    const { revenueTransactionId, amount, sourceCompanyId, sourceDepartmentId, period, rules, beneficiaryCompanyById } = input;

    const totalSharedPct = rules.reduce((sum, r) => sum + r.percentage, 0);
    if (totalSharedPct > 100) return null;

    const rows: Prisma.DepartmentRevenueShareCreateManyInput[] = rules.map((rule) => ({
        revenueTransactionId,
        ruleId: rule.id,
        sourceCompanyId,
        sourceDepartmentId,
        beneficiaryDepartmentId: rule.beneficiaryDepartmentId,
        beneficiaryCompanyId: beneficiaryCompanyById[rule.beneficiaryDepartmentId] ?? sourceCompanyId,
        amount: roundMoney((amount * rule.percentage) / 100),
        percentage: rule.percentage,
        isResidual: false,
        periodMonth: period.month,
        periodYear: period.year,
    }));

    // Residual — the source revenue department keeps the remainder. Only attributable
    // when the transaction has a source department (else the remainder is unassigned).
    const residualPct = roundMoney(100 - totalSharedPct);
    if (sourceDepartmentId && residualPct > 0) {
        rows.push({
            revenueTransactionId,
            ruleId: null,
            sourceCompanyId,
            sourceDepartmentId,
            beneficiaryDepartmentId: sourceDepartmentId,
            beneficiaryCompanyId: sourceCompanyId,
            amount: roundMoney((amount * residualPct) / 100),
            percentage: residualPct,
            isResidual: true,
            periodMonth: period.month,
            periodYear: period.year,
        });
    }

    return rows;
}
