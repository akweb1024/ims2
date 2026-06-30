import { prisma } from './prisma';
import { getISTDateRangeForPeriod } from './date-utils';
import { aggregateDepartmentShares, type DepartmentShareReport } from './revenue-share-report-core';

export { aggregateDepartmentShares } from './revenue-share-report-core';
export type { DepartmentShareRow, DepartmentShareReport, ShareLite, DeptLite } from './revenue-share-report-core';

/**
 * Internal P&L / revenue-share reporting for a single month, computed live from
 * DepartmentRevenueShare (the immutable allocation rows) + RevenueTransaction (gross).
 * Fetches the inputs and delegates the math to aggregateDepartmentShares (pure, tested).
 *
 * Per department:
 *  - grossRevenue : revenue the department billed directly (VERIFIED txns, IST month).
 *  - sharesOut    : revenue it gave to support/production departments (non-residual shares
 *                   whose SOURCE is this department).
 *  - residualKept : the remainder it kept (residual shares whose beneficiary is this dept).
 *  - sharesIn     : revenue it earned by supporting others (non-residual shares whose
 *                   BENEFICIARY is this dept).
 *  - netAttributed: residualKept + sharesIn — the department's attributed bottom line.
 *
 * Conservation: summed across all departments, netAttributed equals total gross of
 * transactions that went through the allocation engine.
 */
export async function getDepartmentShareReport(opts: {
    companyId?: string | null;
    month: number;
    year: number;
}): Promise<DepartmentShareReport> {
    const { companyId, month, year } = opts;
    const base = new Date(Date.UTC(year, month - 1, 15, 12, 0, 0));
    const { start, end } = getISTDateRangeForPeriod('MONTHLY', base);

    const [shares, grossRows, departments] = await Promise.all([
        prisma.departmentRevenueShare.findMany({
            where: { periodMonth: month, periodYear: year },
            select: {
                beneficiaryDepartmentId: true,
                sourceDepartmentId: true,
                amount: true,
                isResidual: true,
                isLocked: true,
            },
        }),
        prisma.revenueTransaction.groupBy({
            by: ['departmentId'],
            where: {
                verificationStatus: 'VERIFIED',
                paymentDate: { gte: start, lte: end },
                departmentId: { not: null },
                ...(companyId ? { companyId } : {}),
            },
            _sum: { amount: true },
        }),
        prisma.department.findMany({
            where: { ...(companyId ? { companyId } : {}) },
            select: { id: true, name: true, departmentType: true, companyId: true, company: { select: { name: true } } },
        }),
    ]);

    const grossByDept: Record<string, number> = {};
    for (const g of grossRows) {
        if (g.departmentId) grossByDept[g.departmentId] = g._sum.amount || 0;
    }

    return aggregateDepartmentShares({
        month,
        year,
        shares,
        grossByDept,
        departments: departments.map((d) => ({
            id: d.id,
            name: d.name,
            departmentType: d.departmentType,
            companyId: d.companyId,
            companyName: d.company?.name || '',
        })),
    });
}

/**
 * Lock every share row in a period so downstream bonus/P&L numbers can never shift,
 * even if rules change later. Returns the number of rows locked.
 */
export async function lockPeriod(month: number, year: number): Promise<number> {
    const res = await prisma.departmentRevenueShare.updateMany({
        where: { periodMonth: month, periodYear: year, isLocked: false },
        data: { isLocked: true },
    });
    return res.count;
}
