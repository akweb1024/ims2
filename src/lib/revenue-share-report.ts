import { prisma } from './prisma';
import { getISTDateRangeForPeriod } from './date-utils';

/**
 * Internal P&L / revenue-share reporting for a single month, computed live from
 * DepartmentRevenueShare (the immutable allocation rows) + RevenueTransaction (gross).
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

export interface DepartmentShareRow {
    departmentId: string;
    departmentName: string;
    companyId: string;
    companyName: string;
    departmentType: string;
    grossRevenue: number;
    sharesOut: number;
    residualKept: number;
    sharesIn: number;
    netAttributed: number;
}

export interface DepartmentShareReport {
    month: number;
    year: number;
    locked: boolean; // true when every share row in the period is locked
    rows: DepartmentShareRow[];
    totals: { grossRevenue: number; sharesOut: number; residualKept: number; sharesIn: number; netAttributed: number };
}

const round = (n: number) => Math.round(n * 100) / 100;

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

    const sharesIn = new Map<string, number>();
    const residualKept = new Map<string, number>();
    const sharesOut = new Map<string, number>();
    let allLocked = shares.length > 0;

    for (const s of shares) {
        if (!s.isLocked) allLocked = false;
        if (s.isResidual) {
            residualKept.set(s.beneficiaryDepartmentId, (residualKept.get(s.beneficiaryDepartmentId) || 0) + s.amount);
        } else {
            sharesIn.set(s.beneficiaryDepartmentId, (sharesIn.get(s.beneficiaryDepartmentId) || 0) + s.amount);
            if (s.sourceDepartmentId) {
                sharesOut.set(s.sourceDepartmentId, (sharesOut.get(s.sourceDepartmentId) || 0) + s.amount);
            }
        }
    }

    const gross = new Map<string, number>();
    for (const g of grossRows) {
        if (g.departmentId) gross.set(g.departmentId, g._sum.amount || 0);
    }

    const rows: DepartmentShareRow[] = departments
        .map((d) => {
            const grossRevenue = round(gross.get(d.id) || 0);
            const out = round(sharesOut.get(d.id) || 0);
            const residual = round(residualKept.get(d.id) || 0);
            const inn = round(sharesIn.get(d.id) || 0);
            return {
                departmentId: d.id,
                departmentName: d.name,
                companyId: d.companyId,
                companyName: d.company?.name || '',
                departmentType: d.departmentType,
                grossRevenue,
                sharesOut: out,
                residualKept: residual,
                sharesIn: inn,
                netAttributed: round(residual + inn),
            };
        })
        // Only show departments with activity in the period.
        .filter((r) => r.grossRevenue || r.sharesOut || r.residualKept || r.sharesIn)
        .sort((a, b) => b.netAttributed - a.netAttributed);

    const totals = rows.reduce(
        (t, r) => ({
            grossRevenue: round(t.grossRevenue + r.grossRevenue),
            sharesOut: round(t.sharesOut + r.sharesOut),
            residualKept: round(t.residualKept + r.residualKept),
            sharesIn: round(t.sharesIn + r.sharesIn),
            netAttributed: round(t.netAttributed + r.netAttributed),
        }),
        { grossRevenue: 0, sharesOut: 0, residualKept: 0, sharesIn: 0, netAttributed: 0 },
    );

    return { month, year, locked: allLocked, rows, totals };
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
